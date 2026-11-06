# AI assistant for the customers app — design

Date: 2026-11-06
Status: draft for approval

## Intent and why

Customers come to Dapita hunting for a specific service they need booked
today, or for nearby shops. Today they must translate that need into the
Explore page's search box and filters themselves. The assistant lets them
say it in their own words — "salons near me open now", "cheap haircut in
Matina", "what time does The Good Cut close?" — and get a conversational
answer that talks them through real options and can hand off straight
into booking.

The product owner decided this is **not** backed by an external AI
service for now (explicitly: no Claude API). The first version uses a
rule-based brain over the app's existing search and catalog data. The
architecture must make swapping in a real LLM later a matter of adding
another implementation behind the same interface, without changing the
conversation UI.

## Goals

- A floating chat bubble available on every customer-facing page. Tapping
  it opens a chat panel.
- The customer types (or taps a suggestion chip) and gets a
  conversational reply that:
  - finds shops/services matching category, area, "near me", "open now",
    and price intents, using the existing shop search;
  - personalizes suggestions with the signed-in customer's interests
    (this branch's `CustomerInterests`) when no category is stated;
  - embeds real shop cards in the chat, tappable through to the shop
    page, with a "Book" shortcut deep-linking to
    `/shops/:shopSlug/book?service=<id>` when a specific service matched;
  - answers questions about a specific shop: opening hours / open-now
    status, service prices, and policies — from data that exists.
- Guests get the full assistant; sign-in is only prompted at the booking
  handoff (same rule as the rest of the app: browsing is free, booking
  needs an account).
- "Near me" works without breaking the privacy promise: the brain runs
  on the device and uses the already-stored client-side location
  (`use-user-location`); the customer's coordinates are never sent to the
  server.
- Honest fallbacks: when the assistant doesn't understand, it says so and
  offers the closest category or Explore link. It never pretends to
  understand.

## Non-goals

- No external LLM calls, no API keys, no new backend AI endpoints in this
  version.
- No booking inside the chat itself — the assistant hands off to the
  existing booking form; it does not submit booking requests.
- No merchant/admin assistant; the bubble appears only on customer
  surfaces (public marketplace + customer account pages), not on
  `/business/*`, `/admin/*`, `/auth/*`, or `/welcome`–`/get-started`.
- No conversation history across devices or server-side storage of chat.
- Not the AI Style Studio (that remains its own P1 feature).

## Anti-goals (failure even if it "works")

- Fabrication of any kind: invented ratings, availability, "best"/"top
  rated" claims, made-up distances or prices. This violates the product's
  core honesty principle. Missing data is labelled missing, exactly like
  the rest of the app.
- Presenting the assistant as smarter than it is. It must not bluff
  through free-form requests it can't parse ("something for my wedding")
  — it degrades gracefully to clarifying or offering categories.
- Sending the device's coordinates or the raw chat transcript to the
  server. Derived search terms are fine: filters and keywords extracted
  from a message (category, area slug, price cap, leftover keywords as
  `q`) may go to the existing search endpoint, exactly as if the customer
  had typed them into Explore's search box. Coordinates never leave the
  device (the search API takes none, so this holds by construction).
- A pushy bubble: no auto-opening, no unprompted messages, no badge
  nagging.

## Constraints

- Stack: React 19 + Vite + TypeScript, TanStack Query v5, zustand,
  shadcn/radix components, Tailwind 4. Follow existing conventions:
  feature module in `src/features/assistant/`, pure logic in `src/lib/`,
  domain types in `src/types/`.
- Must work identically in mock mode (`VITE_USE_MOCKS`) and HTTP mode,
  because it only consumes existing services (`shopsService`,
  catalog/areas/categories queries, `profile`/interests, hours helpers in
  `src/lib/opening-hours.ts`, `distanceKm` in `src/lib/geo.ts`).
- Accessibility: WCAG 2.2 AA like the rest of the app — the bubble and
  panel keyboard-operable, focus-managed, one `<h1>` rule respected (the
  panel is a dialog/complementary region, not a page), reduced motion
  respected for any typing/entrance animation.
- Mobile first: the panel must work from 320px wide (full-screen sheet on
  phones is acceptable; small floating panel on desktop).
- Voice: Dapita's — warm, plain-spoken, sentence case, honest about the
  request-to-confirm model ("you can send a booking request" — never
  "book instantly").

## Decided (by the product owner)

- Hunting-focused assistant: find + book fast, not a chatty companion.
- Conversational replies that talk through options and lead into booking.
- Rule-based brain now; no external AI service for now.
- Floating chat bubble on every customer page.
- Guests get full use; sign-in prompts only at booking handoff.
- Also answers shop-specific questions (hours, prices, policies).

## Decided (my calls, overridable)

- **Brain runs client-side** as pure TypeScript. Defined behind a small
  interface (e.g. `AssistantEngine`: conversation state in → reply out,
  possibly streamed) so a future server-backed LLM engine can replace it
  without UI changes.
- **Name and persona:** "Dapita Assistant" — no invented human name or
  persona. The first message makes clear it's an automated helper.
- **Persistence:** conversation lives in a zustand store persisted to
  `sessionStorage` (per-tab, survives navigation and reload within the
  session, cleared on sign-out). No server storage.
- **Suggestion chips** on open, seeded from the signed-in customer's
  interests (via `useInterests`), falling back to popular top-level
  categories for guests.
- **Reply feel:** a brief typing indicator before each reply is enough;
  no fake token-streaming of instant rule-based answers. The
  `AssistantEngine` interface should still allow streamed output so a
  real LLM can stream later.
- **Distance:** shown only when the device location is available, reusing
  the existing `distanceKm` + location-permission UX
  (`LocationControl`/`LocationPrompt` patterns). Otherwise area names
  only, like Explore.
- **Catalog scale and shop-name matching:** this is a Davao City pilot
  with ~12 seeded shops, and the server search caps `pageSize` at 50. The
  engine may prefetch the full active shop catalog through the existing
  paginated search (page by page, cached with a long `staleTime`) so that
  shop-name fuzzy matching and client-side distance ranking work in both
  mock and HTTP mode, including as the cold first message ("what time
  does The Good Cut close?"). If the catalog ever outgrows a few hundred
  shops, this prefetch is the piece a server-backed engine replaces —
  note it in a comment, don't engineer for it now.
- **Service-level honesty for price/category claims:** the existing
  `priceMax` search filter matches a shop's cheapest service of _any_
  category, so "haircut under 500" could surface a shop whose haircut is
  ₱800 but whose nail service is ₱200. The assistant must not inherit
  that: before claiming a price or offering a "Book" link, fetch the
  matched shops' services (`getShopServices`, cached) and speak and link
  from the actual matched service. If no service in the asked category
  fits the cap, say so honestly. A few extra cached requests per reply is
  acceptable at pilot scale; the honesty principle is not negotiable.

## The brain, concretely (left to the builder to refine)

Intent parsing over a normalized message, roughly in this order:

1. **Shop-specific question:** fuzzy-match a shop name from the loaded
   shop list; detect hours/price/policy question words → answer from
   `ShopDetails` + services + `getOpenStatus`/`describeOpenStatus`.
2. **Find intent:** extract category/subcategory (match against seeded
   category names and common synonyms — "haircut" → Barber/`sub_haircut`,
   "massage" → Spa), area (match the 8 area names), `openNow`
   ("open now", "today"), price cap ("under 500", "cheap" → lowest price
   band), and "near me" (use stored location; if absent, ask once to
   share location or pick an area).
3. **Execute:** run the existing shop search with those parameters; rank
   by distance client-side when location is available (reuse
   `rankNearby`-style logic).
4. **Compose reply:** honest summary ("4 salons in Matina, 2 open now"),
   up to ~3 embedded shop cards with a "see all in Explore" link carrying
   the same filters (the explore URL params already encode them).
5. **Fallback:** if nothing parses, say so plainly and offer interest/
   category chips or Explore.

Synonym lists, exact ranking, and copy are the builder's to settle, within
the voice and honesty constraints above.

## UI shape (left to the builder within these bounds)

- Bubble: bottom-right, above the mobile tab bar if one exists; does not
  cover primary CTAs; hidden on the booking form itself to avoid overlap.
- Panel: full-screen sheet on mobile, anchored panel (~380px) on desktop;
  message list, chip row, text input; shop cards reuse the existing shop
  card component family rather than inventing a new card.
- Entry/greeting copy, empty state, and error states follow `ux-copy`
  conventions already in the app.

## What's left to the builder

- Exact component breakdown, store shape, and `AssistantEngine` interface.
- Synonym/keyword dictionaries and parsing details.
- Which existing queries to reuse vs. call imperatively.
- Tests: unit tests for the parser/engine (pure logic — well suited to
  TDD), component tests for the panel, and an e2e happy path
  (ask → cards → book handoff).

## Out of scope but anticipated

- Server-backed LLM engine (would live behind the same `AssistantEngine`
  interface, with the key in `server/.env`, streamed over the existing
  Transmit SSE setup).
- Multi-turn slot-filling ("which area?" → remembers for the next turn)
  beyond the minimal location/area clarification above — nice if cheap,
  not required for v1.
