# Recommendations Near You Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Location-first shop suggestions: a "Recommended near you" row on the home page and a "You might also like" row on Favorites. They blend "customers like you" (collaborative filtering) with popular shops in your categories and with distance.

**Architecture:**
- **Shared scorer.** One pure scorer in `src/lib/recommendations.ts`, shared with the server through `server/app/shared/domain.ts`. It turns bookings, saves and shops into `{ businessId, fit, reason }` entries.
- **Server.** `GET /api/recommendations` loads the rows, runs the scorer and returns shop summaries with fit and reason. The response never includes another user's id.
- **Mock mode.** The mock service does the same from `MockDb`.
- **Client.** The browser blends fit with distance (`rankNearby`) using a location store persisted to `localStorage`. The position never leaves the device.

**Tech Stack:** React 19 + TanStack Query v5 + zustand (persist) + Vitest/Testing Library; AdonisJS 6 + Lucid + Japa.

**Spec:** `docs/superpowers/specs/2026-10-28-recommendations-design.md`. Read it first; this plan refers to its "calls" by number.

## Global Constraints

- **Branch.** Work on `recommendations` (off `main`). Commit messages are plain sentences in this repo's style, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Used (the matching signal).** A shop counts as used when the customer saved it, or has a booking there with status `confirmed` or `completed`.
- **Excluded for the viewer:**
  - shops they saved,
  - shops where they have any booking whose status isn't `draft`,
  - shops they're a member of,
  - shops that aren't approved.
- **"Customers like you" threshold.** The reason needs **at least 3 distinct neighbours** who used the candidate.
- **Popularity.** Count `confirmed` and `completed` bookings with `start` at or after `now − 90 days`; upcoming bookings count. Ties go to more saves, then to the name (`localeCompare`).
- **Your categories.** The primary category (`categoryIds[0]`) of each used shop. A candidate matches if any of its `categoryIds` is in that set.
- **Radius steps.** 5 km, then 10 km, then 20 km, then the whole city, stopping at the first step with at least 3 entries. Shops without coordinates appear only in the whole-city step.
- **Row size.** At most 8 cards.
- **Blend.** `0.6 × fit + 0.4 × proximity`, where `proximity = 1 − distance / radius` (0 in the whole-city step). Sort by score, then distance, then name.
- **Withdrawn users.** Users with a deletion request are left out of everyone's used data.
- **Tag copy:**

  | Reason | Tag |
  |---|---|
  | `similar_customers` | "Customers like you" |
  | `popular_in_category` | "Popular in {category name}" |
  | `popular` | "Popular near you" |
  | `none` | "Nearest" |

  Without a position, `popular` reads "Popular" and `none` gets no tag.
- **Copy:**
  - Home row heading: "Recommended near you".
  - Favorites row heading: "You might also like".
  - Prompt title: "Where are you?"
  - Prompt note: "We'll show shops near you. Your location stays on this device."
  - Prompt buttons: "Use my location", "Choose your area".
- **Location stays in the browser.** It is never sent in a request and never put in a URL.
- **Checks before every commit** (in the repo root):
  - `npm run typecheck`, `npm run lint`, `npx prettier --check .`, and the relevant `npx vitest run …`
  - For server changes: in `server/`, `npx tsc --noEmit`, `npm run lint`, and `node ace test functional --files …`

## Review Focus

1. **A customer who is also a shop owner.** Their own shop never appears, even when it's the most popular nearby. (Task 1 test "excludes the viewer's own business"; Task 3 test with the owner account.)
2. **A pending request.** A shop where the viewer has only a pending request is excluded, even though it isn't "used". (Task 1 test "excludes shops with any non-draft booking".)
3. **Saving a shop from the row.** Saving it via the heart makes it disappear from the row after the refetch, because the favorite mutation invalidates the recommendations query. (Task 5 test.)
4. **A stored location that becomes unusable** (corrupt JSON, or an area id that no longer exists). This must fall back to the prompt, not crash. (Task 6 test "ignores a corrupt stored location".)
5. **Location denied, then an area chosen.** The row appears and the denied message goes away. (Task 8 test.)

---

### Task 1: Shared scorer

**Files:**
- Create: `src/types/recommendation.ts`, `src/lib/recommendations.ts`, `src/lib/recommendations.test.ts`
- Modify: `server/app/shared/domain.ts`. Add `export { recommendShops, recommendationRules } from '@/lib/recommendations'` and `export type * from '@/types/recommendation'`.

**Interfaces:**
- Produces, in `src/types/recommendation.ts`:
  ```ts
  export type RecommendationReason = 'similar_customers' | 'popular_in_category' | 'popular' | 'none'
  /** What GET /api/recommendations returns per shop. */
  export interface Recommendation { shop: ShopSummary; fit: number; reason: RecommendationReason; categoryId?: ID }
  ```
- Produces, in `src/lib/recommendations.ts`:
  ```ts
  export const recommendationRules = { minNeighbours: 3, popularityWindowDays: 90, radiiKm: [5, 10, 20], minNearby: 3, limit: 8, fitWeight: 0.6 } as const
  export interface RecommendInput {
    viewer?: { id: ID; memberBusinessIds: readonly ID[] }
    bookings: readonly Pick<Booking, 'customerId' | 'businessId' | 'status' | 'start'>[]
    favorites: readonly Pick<Favorite, 'userId' | 'businessId'>[]
    withdrawnUserIds: ReadonlySet<ID>
    /** Approved shops only. */
    shops: readonly Pick<ShopSummary, 'id' | 'name' | 'categoryIds'>[]
    now: Date
  }
  export interface ScoredShop { businessId: ID; fit: number; reason: RecommendationReason; categoryId?: ID }
  export function recommendShops(input: RecommendInput): ScoredShop[]
  ```
  It returns one entry per non-excluded shop, sorted by fit descending, then name.

- [ ] **Step 1: Write failing tests** in `src/lib/recommendations.test.ts`. Use a small fixture builder (shops `s1`…`s6` with categories, `now = new Date('2026-10-29T00:00:00Z')`):
  - `gives "similar_customers" only when 3 neighbours used the shop`:
    - viewer `v` saved `s1`;
    - `a`, `b`, `c` saved `s1` and `s2`;
    - `d` saved `s1` and `s3`.
    - Expect `s2` to be `similar_customers` and `s3` not.
  - `counts confirmed and completed bookings as use, not pending or cancelled`: neighbours linked through a `pending` booking don't count toward the threshold.
  - `excludes shops with any non-draft booking`: viewer has a `pending` booking at `s4` and a `cancelled` one at `s5`. Expect `s4` and `s5` absent; a `draft` at `s6` doesn't exclude it.
  - `excludes saved shops and the viewer's own business` (`memberBusinessIds: ['s2']`).
  - `ranks popular_in_category by recent bookings, counting upcoming ones`:
    - a booking 30 days ahead counts; one 91 days ago doesn't;
    - expect `categoryId` to be the matched category.
  - `breaks popularity ties by saves, then name`.
  - `gives "popular" without viewer history and "none" without recent bookings`.
  - `orders reasons by fit bands`: every `similar_customers` fit > every `popular_in_category` fit > every `popular` fit > `none` (`0`).
  - `ignores withdrawn users' activity`.
- [ ] **Step 2: Run** `npx vitest run src/lib/recommendations.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `recommendShops`.**
  - Neighbour weight is Jaccard similarity: |shared used shops| / |union of used shops|.
  - A candidate's raw score is the sum of the weights of the neighbours who used it.
  - Map raw scores into bands (similar 0.7–1, category 0.4–0.7, popular 0.1–0.4, none 0). Within a band, scale by `raw / maxRawInBand`.
  - Keep the module pure: no I/O, and no `import.meta.env`.
- [ ] **Step 4: Run** the test again. Expected: PASS. Then run `npm run typecheck` and, in `server/`, `npx tsc --noEmit`. Both clean.
- [ ] **Step 5: Commit** "Add the shared recommendation scorer".

### Task 2: Distance blend and tags

**Files:**
- Modify: `src/lib/recommendations.ts`, `src/lib/recommendations.test.ts`

**Interfaces:**
- Consumes: `Recommendation` (Task 1), `distanceKm` from `src/lib/geo.ts`.
- Produces:
  ```ts
  export interface RankedRecommendation extends Recommendation { distanceKm?: number }
  export function rankNearby(entries: readonly Recommendation[], position?: Coordinates, limit?: number): RankedRecommendation[]
  export function recommendationTag(entry: Recommendation, categoryName?: string, hasPosition?: boolean): string | undefined
  ```

- [ ] **Step 1: Write failing tests:**
  - `keeps shops within 5 km when at least 3 are there`.
  - `widens to 10 km, then 20 km, then the whole city`.
  - `places shops without coordinates only in the whole-city step`.
  - `with fit 0 everywhere, orders by distance`.
  - `a strong fit beats a slightly nearer weak fit`: fit 1 at 4 km beats fit 0 at 0.5 km with radius 5.
  - `without a position, orders by fit and sets no distance`.
  - `caps at 8`.
  - `recommendationTag` returns the Global Constraints copy for each reason, with and without a position.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** both functions using the constants in `recommendationRules`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** "Blend recommendations with distance on the device".

### Task 3: Seed saves for the demo

**Files:**
- Create: `src/services/mock/seed/favorites.ts`
- Modify:
  - `src/services/mock/db.ts`: add `favorites: createSeedFavorites(now)` to `createSeedDb`, and bump `MOCK_DB_VERSION` 19 → 20.
  - `scripts/export-mock-seed.mjs`: add `favorites: db.favorites`.
  - `server/database/seeders/main_seeder.ts`: add `favorites: Domain.Favorite[]` to `SeedData` and `Favorite.createMany(...)` after bookings.

**Interfaces:**
- Produces: `createSeedFavorites(now: Date): Favorite[]`.
  - `usr_john`, `usr_mark` and `usr_alyssa` each save `biz_glow_go` and `biz_clearday`.
  - `savedAt` is 1–10 days before `now`.
  - Result: the demo customer (who has a confirmed booking at Glow & Go) gets "Customers like you" for Clearday Skin. Clearday isn't excluded for her.

- [ ] **Step 1: Write the failing test** in `src/services/mock/db.test.ts`, or create it if missing: `seeds three other customers who saved Glow & Go and Clearday`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the seed and wire it through the export script and the seeder.
- [ ] **Step 4: Run** the vitest file (PASS). Then in `server/` run `npm run db:reset`; expected: the exported counts print and the seed succeeds. Run `node ace test functional --files tests/functional/favorites.spec.ts`; expected: PASS (the demo customer's own list is unchanged).
- [ ] **Step 5: Commit** "Seed saved shops so the demo has customers like you".

### Task 4: Server endpoint

**Files:**
- Create: `server/app/services/recommendations.ts`, `server/app/controllers/recommendations_controller.ts`, `server/tests/functional/recommendations.spec.ts`
- Modify: `server/start/routes.ts`. Add `router.get('recommendations', [RecommendationsController, 'index'])` in the **public** group, next to `shops/featured`.

**Interfaces:**
- Consumes: `recommendShops` (Task 1), `getShopSummaries` (`#services/shops`), and the `Booking`, `Favorite`, `Business`, `BusinessMembership` and `DeletionRequest` models.
- Produces: `export async function listRecommendations(user: User | undefined, now = new Date()): Promise<Recommendation[]>`.
  - Run 5 queries: approved businesses; bookings with status ≠ `draft` (only the columns the scorer needs); favorites; deletion-request user ids; the viewer's memberships.
  - Map the Lucid booking rows to the scorer's `{ customerId, businessId, status, start }`. `start` is an ISO string; check `#models/booking` for the column's property name.
  - Call `recommendShops`, then `getShopSummaries`, and zip the results in scorer order.
- The controller's `index({ auth })` returns `listRecommendations(auth.user)`. Silent auth already fills `auth.user`.

- [ ] **Step 1: Write failing tests:**
  - `guests get shops with popular or none reasons and no similar_customers`.
  - `the demo customer gets Clearday as similar_customers and never her booked or saved shops`:
    - assert none of `biz_good_cut`, `biz_serenity`, `biz_glow_go`, `biz_polished`, `biz_hilot`, `biz_bloom`, `biz_arch_lash` are present;
    - assert `biz_kulot` and `biz_ritz_grooming` (not approved) are absent.
  - `the owner never gets their own shop` (ownerEmail → no `goodCutId`).
  - `a customer with a deletion request is not counted`. Insert a deletion request for `usr_john`, then expect Clearday no longer `similar_customers` (2 neighbours left).
  - `the body holds no user ids`. `JSON.stringify(body)` contains none of `usr_john`, `usr_mark`, `usr_alyssa`.
- [ ] **Step 2: Run** `node ace test functional --files tests/functional/recommendations.spec.ts`. Expected: FAIL (501 not_implemented).
- [ ] **Step 3: Implement** the service, controller and route.
- [ ] **Step 4: Run.** Expected: PASS. Then run `npx tsc --noEmit` and `npm run lint` in `server/`.
- [ ] **Step 5: Commit** "Serve recommendations from the API".

### Task 5: Frontend service, mock half and query

**Files:**
- Create: `src/services/recommendations.service.ts`, `src/services/recommendations.service.test.ts`, `src/features/recommendations/api/queries.ts`
- Modify:
  - `src/features/favorites/api/queries.ts`: `onSettled` also invalidates `recommendationKeys.all`.
  - `src/features/booking/api/queries.ts`: `useCreateBookingMutation` `onSuccess` also invalidates `recommendationKeys.all`.

**Interfaces:**
- Produces:
  ```ts
  export interface RecommendationsService { listRecommendations: () => Promise<Recommendation[]> }
  export const recommendationKeys = { all: ['recommendations'] as const, forViewer: (userId: ID | undefined) => [...recommendationKeys.all, userId ?? 'guest'] as const }
  export function useRecommendationsQuery(): UseQueryResult<Recommendation[]>  // key uses useSession().user?.id
  ```
- The mock half follows the favorites service pattern:
  - read `MockDb` and `getMockSessionUser()`;
  - take withdrawn ids from `readMockAccounts()` entries with `deletionRequest`;
  - call `recommendShops`, then map to `toSummary`.

- [ ] **Step 1: Write failing tests** with the same `signInAs` and `delay` mocking as `favorites.service.test.ts`:
  - `guest gets no similar_customers`.
  - `the demo customer gets Clearday as similar_customers and none of her booked or saved shops`.
  - `saving a shop removes it from the next list`.
  - In `FavoriteButton.test.tsx`, or a small hook test: toggling a favorite invalidates `['recommendations']`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** "Load recommendations in the app and in mock mode".

### Task 6: Remembered location (device or area)

**Files:**
- Modify: `src/hooks/use-user-location.ts`. Update its doc comment: the location is remembered on this device and never sent.
- Create: `src/hooks/use-user-location.test.ts`

**Interfaces:**
- Produces (Explore's existing `status`, `position` and `locate` keep working):
  ```ts
  export type LocationSource = 'device' | 'area'
  interface LocationState {
    status: LocationStatus
    position?: Coordinates
    source?: LocationSource
    /** Set when source is 'area'. */
    area?: Pick<Area, 'id' | 'name'>
    locate: () => void
    chooseArea: (area: Area) => void   // position = area.center, status 'found'
    clear: () => void                  // back to 'idle', nothing stored
  }
  ```
- Persist with `zustand/middleware` `persist` + `createJSONStorage(() => localStorage)`, name `dapita-location`, saving only `position`, `source` and `area`. On rehydrate, a stored position sets `status: 'found'`.

- [ ] **Step 1: Write failing tests:**
  - `chooseArea sets the area centre and status found`.
  - `a stored location is restored on load`: write the storage key, call `useUserLocation.persist.rehydrate()`, expect `found`.
  - `clear forgets it`.
  - `ignores a corrupt stored location` (invalid JSON or a missing `lat`): status `idle`.
  - `a denied device location keeps any area choice possible`: `locate` with mocked `geolocation` rejecting → `denied`, then `chooseArea` → `found`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** this file plus `src/features/discovery/components/ExploreMap.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** "Remember the customer's location on this device".

### Task 7: Recommendation row and card details

**Files:**
- Modify: `src/features/discovery/components/ShopCard.tsx`. Add optional `distanceKm?: number` (shown after the area as "Bajada · 0.4 km" via `formatDistance`) and `tag?: string`, a tinted pill reusing the tag style DESIGN.md already uses for chips. Keep the existing callers unchanged.
- Create: `src/features/recommendations/components/RecommendedRow.tsx` and its test.

**Interfaces:**
- Consumes: `useRecommendationsQuery` (Task 5), `rankNearby` and `recommendationTag` (Task 2), `useUserLocation` (Task 6), `useCategoriesQuery`, and `HorizontalScroller`.
- Produces: `RecommendedRow({ title, headingId, position, showError }: { title: string; headingId: string; position?: Coordinates; showError?: boolean })`.
  - It renders a `section` labelled by the heading and a `HorizontalScroller` (`label = title`) of `ShopCard`s with `tag` and `distanceKm`.
  - It shows `ShopCardSkeleton`s while pending.
  - On error it shows the existing `ErrorState` with retry when `showError` is set (the home page), and `null` otherwise (Favorites).
  - It renders `null` when there are no entries.

- [ ] **Step 1: Write failing tests:**
  - `shows up to 8 cards with their tags and distances`.
  - `shows nothing when the list is empty`.
  - `shows a retryable error only when showError is set`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** "Add the recommended shops row".

### Task 8: Home page, location first

**Files:**
- Create:
  - `src/features/recommendations/components/LocationPrompt.tsx`: the "Where are you?" card with the two buttons. "Choose your area" opens an area picker from `useAreasQuery`; the builder picks the control. It also shows the denied or unavailable message.
  - `src/features/recommendations/components/LocationControl.tsx`: "📍 {area name | Near you} · Change", where Change calls `clear()`.
- Modify:
  - `src/routes/HomePage.tsx`: with no location, show `LocationPrompt` between `HomeHero` and Categories. With a location, show `LocationControl` + `RecommendedRow title="Recommended near you"` first, then Categories. Featured cards also get `distanceKm`.
  - `src/app/routes.test.tsx`, or a new `src/routes/HomePage.test.tsx`.

- [ ] **Step 1: Write failing tests:**
  - `asks where you are on a first visit`.
  - `choosing an area shows "Recommended near you" with tags`.
  - `featured shops show distances once a location is set`.
  - `Change brings the prompt back`.
  - `a denied location shows the message and still lets you choose an area`.
  - `a failed recommendations request shows a retryable error for the row only`: categories and featured still render. Pass `showError` to `RecommendedRow`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** this test plus the full `npx vitest run`. Expected: all PASS.
- [ ] **Step 5: Commit** "Put recommendations near you first on the home page".

### Task 9: Favorites page row

**Files:**
- Modify: `src/routes/FavoritesPage.tsx`. Below the list (or below the empty state), add `<RecommendedRow title="You might also like" headingId="also-like-heading" position={location.position} />`. With no position, show a "Set your location" link to `/` above the row (call 10).
- Test: `src/routes/FavoritesPage.test.tsx` (create).

- [ ] **Step 1: Write failing tests:**
  - `shows "You might also like" under the saved shops without any saved shop in it`.
  - `with nothing saved, shows the empty state and the row`.
  - `without a location, links to set one and shows no distances`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** "Suggest similar shops on the Favorites page".

### Task 10: Privacy notice

**Files:**
- Modify:
  - `src/features/legal/content.ts`. Add one item to the "Why we use it" list and one sentence to "Cookies and storage".
  - `src/config/legal.ts`: `privacy_notice.version` `'draft-2026-10'` → `'draft-2026-11'`.
- Test: the existing legal and consent tests. Update any that pin the old version string.

- [ ] **Step 1: Write the copy**, exactly:
  - "Why we use it": "To suggest shops you might like, using bookings and saved shops combined across customers. No one else can see what you booked or saved."
  - "Cookies and storage", appended: "If you set a location, your browser remembers it on this device only; choose Change to clear it."
- [ ] **Step 2: Run** `npx vitest run` and fix tests that pinned `draft-2026-10`. Run `npm run db:reset` in `server/` so the seeded consents use the new version, then `node ace test`. Expected: all PASS.
- [ ] **Step 3: Commit** "Tell customers how suggestions and the saved location work".

### Task 11: Whole-branch check in the browser

- [ ] Run every check in Global Constraints across both apps. Expected: all clean.
- [ ] Start `npx vite --host` (if Chrome stalls, see the note on the Chrome extension; Edge works) and check the following:
  - **Signed out:** the home page shows the prompt. "Choose your area" → Bajada shows the row with "Nearest" and "Popular near you" tags.
  - **Signed in as the demo customer:** Clearday Skin shows "Customers like you", and none of her booked or saved shops appear.
  - **Favorites:** "You might also like" shows. Saving Clearday from the row removes it from the row.
  - **Owner account:** The Good Cut never appears.
  - **Dark mode:** the tags and location control are legible.
- [ ] Commit any fixes, then open a PR that links the spec.
