# Customer AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A floating "Dapita Assistant" chat bubble on every customer page that parses natural-language requests ("salons near me open now", "what time does The Good Cut close?"), answers conversationally from real catalog data, embeds shop cards, and deep-links into booking.

**Architecture:** A pure rule-based parser and reply composer live in `src/lib/assistant.ts` (no React, no I/O), an async engine in `src/features/assistant/engine.ts` wires them to the existing `shopsService`/`catalogService` behind an `AssistantEngine` interface (so a server-backed LLM can replace it later), and a zustand store persisted to `sessionStorage` holds the conversation. The brain runs entirely on the device; coordinates never go to the server.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, zustand (persist), shadcn/radix (Sheet, Button), Tailwind 4, vitest + testing-library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-ai-assistant-design.md`

## Global Constraints

- Never fabricate: no invented ratings, availability, "best" claims, prices, or distances. Missing data is labelled missing ("No reviews yet" style).
- The device's coordinates and the raw chat transcript never go to the server. Derived search params (`q`, `category`, `area`, `priceMax`, `openNow`) may — identical to Explore.
- Works identically with `VITE_USE_MOCKS` true and false: consume only the existing services layer, never `fetch` directly.
- Voice: warm, plain-spoken, sentence case. "Send booking request", never "book instantly". The assistant introduces itself as automated.
- WCAG 2.2 AA: bubble and panel keyboard-operable, focus managed, visible labels or `aria-label` on every control, reduced motion respected for the typing indicator.
- Works from 320px wide; panel is a full-width sheet on mobile, ~380px on desktop.
- No new backend code, no new dependencies.
- Follow repo conventions: feature code in `src/features/assistant/`, pure logic in `src/lib/`, types in `src/types/`, co-located `.test.ts(x)` files, path alias `@/`.
- Commit messages in the repo's plain sentence style, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Verification: `npm run check` must pass at the end of every task (typecheck + lint + format + tests).

## Review Focus

Failure modes the spec implies; each has its pinning test in the task noted:

1. Empty or whitespace-only input submitted → nothing sent, no crash (Task 4).
2. "near me" with no stored location → the assistant asks to share a location or pick an area; it never claims "0 results" or crashes (Task 3).
3. A shop question naming an unknown shop → honest "I couldn't find that shop", offering search instead (Task 3).
4. The price-filter trap: a shop whose only sub-cap service is in a *different* category must not be presented for "«category» under ₱N" (Task 3).
5. Corrupt or unavailable `sessionStorage` → the store falls back to a fresh in-memory conversation instead of throwing (Task 4).

---

### Task 1: Types and the pure message parser

**Files:**
- Create: `src/types/assistant.ts`
- Create: `src/lib/assistant.ts`
- Test: `src/lib/assistant.test.ts`

**Interfaces:**
- Consumes: `ServiceCategory`, `Area` from `@/types/catalog`; `ShopSummary`, `Service`, `ShopDetails` from `@/types/business`; `ID` from `@/types/common`.
- Produces (used by every later task):

```ts
// src/types/assistant.ts
export interface AssistantShopResult {
  shop: ShopSummary
  /** The specific service that matched, when one did. Drives the Book link and any price claim. */
  service?: Service
  distanceKm?: number
}

export interface AssistantReply {
  text: string
  shops: AssistantShopResult[]
  /** Explore URL carrying the same filters; set when a find produced results. */
  exploreHref?: string
  /** Tappable follow-ups, sent as if typed. */
  suggestions: string[]
}

export type AssistantMessage =
  | { id: ID; role: 'user'; text: string }
  | { id: ID; role: 'assistant'; reply: AssistantReply }
```

```ts
// src/lib/assistant.ts  (pure: no React, no services, no Date.now() without a `now` param)
export interface AssistantContext {
  categories: readonly ServiceCategory[]
  areas: readonly Area[]
  shops: readonly ShopSummary[]
}

export interface FindIntent {
  kind: 'find'
  categorySlug?: string
  areaSlug?: string
  openNow?: boolean
  priceMax?: number
  nearMe?: boolean
  /** Leftover tokens, for the q= search param. */
  keywords: string[]
}

export type AssistantIntent =
  | FindIntent
  | { kind: 'shop_question'; shopSlug: string; topic: 'hours' | 'prices' | 'policies' }
  | { kind: 'greeting' }
  | { kind: 'unknown' }

export function parseMessage(message: string, context: AssistantContext): AssistantIntent
```

Parsing rules the tests pin (matching is on text normalized the way `src/services/shops.service.ts:53` does — lowercase, accents and apostrophes stripped):

- A shop whose normalized name appears in the message, together with a topic word, wins over everything: hours words (`open`, `close`, `hours`, `what time`), price words (`price`, `how much`, `cost`, `magkano`), policy words (`policy`, `cancel`, `cancellation`, `deposit`, `no-show`). Shop name without a topic word → `shop_question` with topic `hours` is wrong; treat it as `find` with the name as keywords (the reply will show that shop's card).
- Category: match category/subcategory names from context plus a synonym table (builder writes it; must at least map `haircut`/`barber shop` → the Barber category, `massage` → Spa & Massage, `manicure`/`pedicure` → Nails). A subcategory name sets the subcategory's slug.
- Area: any of the 8 seeded area names in the message sets `areaSlug`.
- `near me`, `nearby`, `close by`, `malapit` → `nearMe: true`.
- `open now`, `open today`, `open` (as its own token) → `openNow: true`.
- `under ₱?N` / `below N` / `less than N` → `priceMax: N`; `cheap`/`mura` → `priceMax: 300` (the lowest band in `priceOptions`, `src/features/discovery/explore-params.ts:9`).
- Bare greetings (`hi`, `hello`, `hey`, `kumusta`) → `greeting`.
- A message with no category, area, shop, price, near-me, open-now and no leftover keywords → `unknown`.
- Matched words are consumed; what remains becomes `keywords`.

- [ ] **Step 1: Write failing tests in `src/lib/assistant.test.ts`**

Build a small `AssistantContext` fixture inline (2 categories + 1 subcategory, 2 areas named Matina and Lanang, 2 shops named "The Good Cut Barbershop" and "Hair & Flair Salon"). Test at minimum:

```ts
test('parses category, area, open-now and price in one message', () => {
  const intent = parseMessage('cheap salons in Matina open now', context)
  expect(intent).toEqual({
    kind: 'find', categorySlug: 'salon', areaSlug: 'matina',
    openNow: true, priceMax: 300, nearMe: undefined, keywords: [],
  })
})
test('parses "near me"', ...)        // nearMe: true, no areaSlug
test('parses "under 500"', ...)      // priceMax: 500
test('shop name plus hours words is a shop question', () => {
  expect(parseMessage('what time does the good cut close?', context))
    .toEqual({ kind: 'shop_question', shopSlug: 'the-good-cut-barbershop', topic: 'hours' })
})
test('shop name alone is a find with keywords', ...)
test('bare greeting', ...)
test('unparseable message is unknown', () => {
  expect(parseMessage('something for my wedding next month', context).kind).toBe('unknown')
})
```

(Adjust the exact `toEqual` shapes to the implementation's use of `undefined` vs omitted keys — but the pinned fields must hold.)

- [ ] **Step 2: Run `npx vitest run src/lib/assistant.test.ts` — expect FAIL (module not found)**

- [ ] **Step 3: Create `src/types/assistant.ts` and implement `parseMessage` in `src/lib/assistant.ts`**

- [ ] **Step 4: Run `npx vitest run src/lib/assistant.test.ts` — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/types/assistant.ts src/lib/assistant.ts src/lib/assistant.test.ts
git commit -m "Parse what a customer asks the assistant for"
```

---

### Task 2: Pure reply composition

**Files:**
- Modify: `src/lib/assistant.ts`
- Test: `src/lib/assistant.test.ts`

**Interfaces:**
- Consumes: Task 1's types; `getOpenStatus`, `describeOpenStatus`, `weeklySchedule` from `@/lib/opening-hours`; `formatPeso` from `@/lib/format`.
- Produces (Task 3 calls these):

```ts
/** /explore URL (path + query) carrying the intent's filters, using Explore's own URL keys. */
export function exploreHrefForIntent(intent: FindIntent): string

export function composeFindReply(
  intent: FindIntent,
  results: AssistantShopResult[],
  total: number,
): AssistantReply

export function composeShopAnswer(
  topic: 'hours' | 'prices' | 'policies',
  shop: ShopDetails,
  services: Service[],
  now?: Date,
): AssistantReply

export function composeUnknownReply(suggestions: string[]): AssistantReply
export function composeGreeting(suggestions: string[]): AssistantReply
```

Copy rules (exact wording is the builder's within the voice constraints; the *content* is pinned):

- `composeFindReply` text states the honest count and scope ("4 salons in Matina, 2 open right now"), never superlatives. `shops` holds at most 3 results; `exploreHref` is set whenever `total > 0`. `total === 0` → text says no match for exactly what was asked and suggests loosening (the nearest category or dropping a filter) — never "try again later".
- `composeShopAnswer('hours', …)` uses `describeOpenStatus(getOpenStatus(...))` for the live status plus today's hours from `weeklySchedule`; a shop with no hours data says "Opening hours not provided".
- `composeShopAnswer('prices', …)` lists up to 5 services with `formatPeso`; `quote` prices read "price on consultation"; `from`/`range` prices are called estimates until the shop confirms.
- `composeShopAnswer('policies', …)` returns the shop's own policy text; missing policies are labelled not provided.
- Every composed reply's `shops[0].service`, when set, is the only basis for any specific price in `text`.
- `exploreHrefForIntent` uses URL keys `q`, `category`, `area`, `price`, `open=1` (`src/features/discovery/explore-params.ts:16-27`); `nearMe` adds nothing (location never leaves the device).

- [ ] **Step 1: Write failing tests** — at minimum: `exploreHrefForIntent` round-trips through `parseExploreParams` to the same `ShopSearchParams`; `composeFindReply` caps `shops` at 3 and sets `exploreHref`; zero-results text contains no shop cards; `composeShopAnswer('hours')` for a shop with empty `hours` contains "not provided"; a `quote` price never renders as a number.

- [ ] **Step 2: Run `npx vitest run src/lib/assistant.test.ts` — expect new tests FAIL**

- [ ] **Step 3: Implement the five functions in `src/lib/assistant.ts`**

- [ ] **Step 4: Run `npx vitest run src/lib/assistant.test.ts` — expect PASS**

- [ ] **Step 5: Commit** — `git commit -m "Compose honest assistant replies from catalog data"`

---

### Task 3: The engine

**Files:**
- Create: `src/features/assistant/engine.ts`
- Test: `src/features/assistant/engine.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2; `shopsService` (`searchShops`, `getShop`, `getShopServices` — `src/services/shops.service.ts:26-34`); `catalogService.getCategories/getAreas`; `distanceKm` from `@/lib/geo`; `liveInterestCategories` from `@/lib/interests`.
- Produces (Task 4 consumes):

```ts
export interface EngineDeps {
  getContext: () => Promise<AssistantContext>
  getShop: (slug: string) => Promise<ShopDetails>
  getShopServices: (slug: string) => Promise<Service[]>
  /** The device's stored position, if any. Read-only; never forwarded. */
  getPosition: () => Coordinates | undefined
  /** Signed-in customer's interest category ids; [] for guests. */
  getInterestCategoryIds: () => readonly ID[]
  now?: () => Date
}

export interface AssistantEngine {
  reply: (message: string) => Promise<AssistantReply>
  greeting: () => AssistantReply | Promise<AssistantReply>
}

export function createRuleEngine(deps: EngineDeps): AssistantEngine

/** Pages through searchShops (pageSize 50, the server cap) until `total` is reached. */
export async function fetchAllShops(): Promise<ShopSummary[]>

/** Real deps: fetchAllShops + catalogService cached in module scope with a 5-minute TTL, shopsService pass-throughs. */
export function createDefaultDeps(options: {
  getPosition: () => Coordinates | undefined
  getInterestCategoryIds: () => readonly ID[]
}): EngineDeps
```

Engine behavior (tests pin each):

1. `reply` parses with the context, then by intent kind:
   - `find` with `nearMe` and no position → a reply (no shops) asking to share a location or name an area; `suggestions` include 2–3 area names.
   - `find` → `searchShops` with params from the intent (`keywords.join(' ')` as `q`, `pageSize: 50`); when a position exists, results are ranked by `distanceKm(position, shop.coordinates)` ascending (shops without coordinates last) and each result carries `distanceKm`; top 3 become cards via `composeFindReply`.
   - **Service-level honesty:** when the intent has both `categorySlug` and `priceMax`, fetch `getShopServices` for up to the first 6 ranked shops and keep only shops with an active service in that category (or its subcategories) priced at or under the cap (`fixed`/`from`/`range` use `amount`; `quote` never matches a price cap); that service becomes `AssistantShopResult.service`. When the intent names a *subcategory*, the matching service also becomes `service` even without a price cap.
   - `shop_question` → `getShop` + `getShopServices`, then `composeShopAnswer`. Unknown slug (`getShop` rejects) → honest not-found reply offering search (Review Focus 3).
   - `greeting`/`unknown` → `composeGreeting`/`composeUnknownReply` with suggestions.
2. `greeting()` suggestions come from `getInterestCategoryIds()` mapped to category names ("Find a Barber near me" shape), falling back to the first 3 live top-level categories by `sortOrder` for guests.
3. Any thrown service error → a reply that says something went wrong and to try again; the error is not rethrown to the UI.

- [ ] **Step 1: Write failing tests in `src/features/assistant/engine.test.ts`** — build fake `EngineDeps` returning fixture data (reuse the Task 1 fixture shape; give shops `coordinates` and give one shop a cheap service in the *wrong* category). Pin at minimum: near-me-without-location asks instead of searching (Review Focus 2); distance ranking orders by proximity; **the price-trap shop is excluded for "«category» under ₱N" while a shop with a genuinely matching service is kept, and that service is on the result (Review Focus 4)**; unknown shop slug → not-found reply (Review Focus 3); guest vs interested greeting suggestions differ; a rejecting dep produces the error reply, not a rejection.

- [ ] **Step 2: Run `npx vitest run src/features/assistant/engine.test.ts` — expect FAIL**

- [ ] **Step 3: Implement `engine.ts`.** `fetchAllShops` loops `shopsService.searchShops({ page, pageSize: 50 })` accumulating `items` until `items.length >= total`, hard-capped at 10 pages with a comment that a server-backed engine replaces this prefetch if the catalog outgrows the pilot.

- [ ] **Step 4: Run `npx vitest run src/features/assistant/engine.test.ts` — expect PASS**

- [ ] **Step 5: Commit** — `git commit -m "Answer assistant questions from the live catalog"`

---

### Task 4: Conversation store and hook

**Files:**
- Create: `src/features/assistant/store.ts`
- Create: `src/features/assistant/use-assistant.ts`
- Test: `src/features/assistant/store.test.ts`, `src/features/assistant/use-assistant.test.tsx`

**Interfaces:**
- Consumes: Task 3's `createRuleEngine`/`createDefaultDeps`; `useUserLocation` (`src/hooks/use-user-location.ts:37`); `useInterests` (`src/features/interests/use-interests.ts:97`); `useSession` from `@/features/auth/api/queries`; the id helper in `src/lib/ids.ts`.
- Produces (Task 5 consumes):

```ts
// store.ts
export const ASSISTANT_STORAGE_KEY = 'dapita-assistant'
interface AssistantState {
  open: boolean
  messages: AssistantMessage[]
  busy: boolean
  setOpen: (open: boolean) => void
  append: (message: AssistantMessage) => void
  setBusy: (busy: boolean) => void
  clear: () => void
}
export const useAssistantStore: UseBoundStore<StoreApi<AssistantState>>
```

```ts
// use-assistant.ts
/** `engine` is injectable for tests; defaults to createRuleEngine(createDefaultDeps(...)). */
export function useAssistant(engine?: AssistantEngine): {
  open: boolean
  setOpen: (open: boolean) => void
  messages: AssistantMessage[]
  busy: boolean
  send: (text: string) => void
}
```

Behavior:
- The store persists **only `messages`** to `sessionStorage` (zustand `persist` + `partialize`, mirroring `use-user-location.ts`'s shape); `open`/`busy` are per-mount. A `merge` that validates the stored shape falls back to `[]` on anything unreadable (Review Focus 5 — `createJSONStorage` already tolerates a missing `sessionStorage`).
- `send(text)`: trimmed-empty text is a no-op (Review Focus 1); otherwise append the user message, `busy: true`, await `engine.reply`, append the assistant message, `busy: false`. One engine instance per hook lifetime (`useRef`/module single).
- Opening with zero messages appends the engine's `greeting()` as the first assistant message.
- When the session user id changes (sign-in, sign-out, user switch), `clear()` runs — a `useEffect` on `user?.id ?? null` with a ref for the previous value; the initial mount does not clear.

- [ ] **Step 1: Write failing tests** — store: persists messages (feed a fake storage), survives corrupt JSON with `[]` (Review Focus 5), `clear` empties. Hook (testing-library `renderHook` with a QueryClient + fake engine injected — give `useAssistant` an optional `engine` parameter for tests): whitespace `send` appends nothing (Review Focus 1); a send appends user then assistant message and toggles `busy`; changing the mocked session user clears messages.

- [ ] **Step 2: Run `npx vitest run src/features/assistant` — expect new tests FAIL**

- [ ] **Step 3: Implement `store.ts` and `use-assistant.ts`**

- [ ] **Step 4: Run `npx vitest run src/features/assistant` — expect PASS**

- [ ] **Step 5: Commit** — `git commit -m "Keep the assistant conversation on the device"`

---

### Task 5: Bubble, panel, and message UI

**Files:**
- Create: `src/features/assistant/components/AssistantWidget.tsx` (bubble + panel shell)
- Create: `src/features/assistant/components/AssistantConversation.tsx` (message list, shop cards, input)
- Modify: `src/components/layouts/PublicLayout.tsx` (mount `<AssistantWidget />` after `<AppCommandMenu …/>`)
- Test: `src/features/assistant/components/AssistantWidget.test.tsx`

**Interfaces:**
- Consumes: Task 4's `useAssistant`; `ShopCard` (`src/features/discovery/components/ShopCard.tsx:35` — pass `shop`, `category`, `distanceKm`, `headingLevel="h3"`); `bookingHref` (`src/features/shops/links.ts:11`); `useCategoriesQuery` for card category labels; shadcn `Sheet`, `Button`, `Input` from `@/components/ui`; `MessageCircleIcon`/`SendIcon` from lucide.
- Produces: `AssistantWidget` (no props), self-contained.

Pinned decisions:
- Bubble: fixed, bottom-right; mobile `bottom` offset includes `var(--spacing-tabbar)` + safe-area inset so it clears the `BottomTabBar` (see `PublicLayout.tsx:18` for the expression); desktop `bottom-6 right-6`. `aria-label="Open Dapita Assistant"`. Minimum 44px hit target. Hidden while the panel is open and on the booking page (`useMatch('/shops/:shopSlug/book')` from react-router).
- Panel: shadcn `Sheet`, `side="right"`, `className="w-full sm:max-w-[380px]"`; header title "Dapita Assistant" with a one-line automated-helper subtitle; Sheet handles focus trap, Escape, and overlay.
- Messages: user messages right-aligned, assistant left; an assistant reply renders `reply.text`, then a `ShopCard` per `reply.shops` entry — each followed by a "Send booking request" `Button asChild` + `Link to={bookingHref(shop.slug, service?.id)}` **only when `service` is set**, plus an Explore link when `reply.exploreHref` is set, plus suggestion chips (buttons that call `send(label)`).
- While `busy`: a typing indicator with `motion-safe:animate-pulse` (or equivalent — animation only under `motion-safe:`), `aria-hidden`, and the input disabled.
- The input is a `<form>`; submit sends and clears it. The message list has `aria-live="polite"`.
- Guests need no special handling at the booking handoff: the `/shops/:shopSlug/book` route already requires the customer role and redirects to sign-in (`src/app/routes.tsx:64-72`). The Book link goes there unconditionally.

- [ ] **Step 1: Write failing component tests** — render `AssistantWidget` inside a `MemoryRouter` + QueryClient with a fake engine: bubble renders with its accessible name; clicking it opens the panel showing the greeting; typing "salons in Matina" and submitting shows the user message and then an assistant reply containing a shop card link to the shop; a reply result **with** `service` shows a "Send booking request" link whose `href` equals `bookingHref(slug, serviceId)`, and one **without** `service` shows none; on `/shops/x/book` route the bubble is absent.

- [ ] **Step 2: Run `npx vitest run src/features/assistant/components` — expect FAIL**

- [ ] **Step 3: Implement the two components and mount in `PublicLayout`**

- [ ] **Step 4: Run `npx vitest run src/features/assistant/components` — expect PASS; then `npm run check`**

- [ ] **Step 5: Commit** — `git commit -m "Give customers a floating assistant on every marketplace page"`

---

### Task 6: End-to-end happy path

**Files:**
- Create: `e2e/assistant.spec.ts` (follow the structure of existing specs in `e2e/`)

**Interfaces:**
- Consumes: the seeded mock data (The Good Cut Barbershop etc., `src/services/mock/seed/businesses.ts`), existing e2e helpers/fixtures in `e2e/`.

- [ ] **Step 1: Read one existing spec in `e2e/` for the project's fixtures (base URL, mock-mode setup, sign-in helper if any)**

- [ ] **Step 2: Write `e2e/assistant.spec.ts`** covering, as a guest in mock mode:
  1. Open home → the "Open Dapita Assistant" button is visible.
  2. Open it → greeting message and suggestion chips appear.
  3. Ask "barbers in Poblacion" (adjust to a seeded area with a barber) → an assistant reply with at least one shop card appears; no fabricated rating text.
  4. Ask "what time does The Good Cut close" → reply contains "Open" or "Closed".
  5. Click a shop card → lands on the shop page.

- [ ] **Step 3: Run `npx playwright test e2e/assistant.spec.ts` — expect PASS (run `npm run test:e2e:install` first if chromium is missing)**

- [ ] **Step 4: Run the full `npm run check`**

- [ ] **Step 5: Commit** — `git commit -m "Walk the assistant happy path end to end"`
