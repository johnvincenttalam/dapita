# Recommendations near you: design

Date: 28 Oct 2026 · Status: draft for approval · Priority: P1 (customer discovery)

## Intent

A returning customer who isn't sure what to book next should find their next shop without searching. Dapita suggests shops the way a food-delivery app does: **location first**. You say where you are once, and every suggestion is a shop near you. Within that, it favours shops that "customers like you" booked or saved, and otherwise popular shops in the categories you use.

There's very little booking history at launch: the seed has about 13 shops, 5 users and 13 bookings. So true collaborative filtering ("customers who booked X also booked Y") is only used when there is enough overlap to mean something. Until then the fallback is **popular shops in the categories you've booked or saved**. That was the user's choice.

## Goals

- **Home page.**
  - A location prompt for first-time visitors.
  - Once a location is set, a **"Recommended near you"** row comes first. It is one blended list ranked by distance and fit, and each card carries one reason tag.
- **Favorites page.** A **"You might also like"** row below the saved shops, using the same picks.
- **Collaborative filtering.** Used when the data supports it, falling back to popular in your categories, then popular overall.
- **Location stays on the device.** The server never receives the customer's position.
- **Both modes.** It works against the AdonisJS API and in mock mode, with the same results for the same data.

## Non-goals

- Chains or multi-branch businesses ("nearest branch"). Each business is one place today.
- Server-side distance or geo queries. Launch is one city with tens of shops, so the client can rank the whole candidate list. Revisit past roughly 500 approved shops.
- An account "For you" page (mockup option B) or a row under My bookings (option A).
- Explaining recommendations in more detail than the tag, or "not interested" / hide controls.
- Email or push recommendations.
- Learning from page views, searches or clicks. Only bookings and saves are signals.
- Machine-learning models or third-party recommendation services.

## Anti-goals (a failure even if it works)

- **Leaking what someone else booked.** A "Customers like you" pick that traces back to one identifiable person is a failure (see the overlap threshold below).
- **Sending exact coordinates to the server**, or storing them anywhere except the customer's own browser.
- **Suggesting:**
  - a shop the customer already saved or booked,
  - their own business (owners and staff are also customers),
  - a shop that isn't approved.
- **Forcing the location prompt.** Skipping it must leave the home page as useful as it is today.
- **Inventing reasons.** A tag must be true: no "Popular" on a shop with no bookings.

## What the user decided

- **Both kinds of suggestion:** collaborative filtering and nearest shops.
- **Fallback:** popular shops in the categories the customer has booked or saved.
- **Location first for all suggestions,** like foodpanda. Suggestions are always shops near the customer.
- **Home page layout B** (`.superpowers/brainstorm/1225-1793180956/content/home-layout.html`): one blended "Recommended near you" row with a reason tag per card, and a "Where are you?" card for first visits.
- **Account placement C** (`…/account-placement.html`): "You might also like" under the saved shops on the Favorites page.
- **Privacy notice option (b).**
  - Update the privacy notice (`src/features/legal/content.ts`) and bump `privacy_notice` in `src/config/legal.ts` (for example to `draft-2026-11`), so existing customers are asked to accept the new version.
  - Add one line under "Why we use it": bookings and saved shops are used, combined across customers, to suggest shops; no one else sees what you booked.
  - Add one sentence under "Cookies and storage": if you set a location, your browser remembers it on this device only, and you can clear it with "Change".
  - No opt-out setting in this version.
- Proceed with the description played back in chat, including the calls marked as guesses there. They are listed below.

## Calls I made (marked as such; easy to change)

1. **Signals and exclusions are two different sets.**
   - **Used (the matching signal).** A customer "used" a shop if they saved it, or have a booking there with status `confirmed` or `completed`. `pending`, `alternative_proposed`, `declined`, `cancelled`, `no_show`, `expired` and `draft` don't count.
   - **Excluded from the viewer's suggestions.** Every shop the viewer saved, every shop where they have *any* non-`draft` booking (pending, declined or cancelled included), and every shop they're a member of. "Already booked" means they've dealt with the shop at all, so a pending request is never suggested back to them.
2. **Overlap threshold.** A shop gets the "Customers like you" reason only when **at least 3 distinct other customers** who share a shop with you also used it. Below that, it can only qualify by popularity.
3. **Popularity window.** Count `confirmed` and `completed` bookings whose start time is **90 days ago or later, upcoming confirmed bookings included**. Most confirmed bookings are in the future, and they're real demand. Ties are broken by the number of saves, then by name.
4. **Your categories.** These are the *primary* category (`categoryIds[0]`) of every shop you've used. A candidate matches if any of its categories is in that set.
5. **Nearby radius.**
   - Start at 5 km from the customer.
   - If fewer than 3 candidates fall inside, widen to 10 km, then 20 km, then the whole city.
   - Shops without coordinates are only shown in the whole-city step.
6. **Row size.** Up to 8 cards. The row scrolls sideways on phones and wraps or scrolls on wider screens, matching the existing Featured shops row.
7. **Location is remembered on the device.**
   - The `useUserLocation` store is persisted to `localStorage`, holding either the coordinates or the chosen area.
   - This changes its current rule ("never stored … a reload asks again"). The Explore map shares the same store, so setting a location in one place sets it in the other.
   - A "Change" control clears it or replaces it.
8. **"Choose your area"** uses the existing areas list and its `center` coordinates as the position. The label shows the area name ("📍 Bajada"); with the device location it reads "📍 Near you".
9. **No history, or not signed in.** The row is nearest plus popular-near-you. There are no "Customers like you" tags, and guests get the same row.
10. **Empty Favorites page.**
    - A customer with nothing saved and no bookings sees the existing "No saved shops yet" empty state, followed by the "You might also like" row of popular shops near them.
    - With no location set, the row shows a "Set your location" link in place of distances and ranks by popularity alone.
11. **Deletion requests.** Customers with a deletion request on file (`deletion_requests`, and its mock equivalent) are left out of everyone's "used" data. Their own suggestions still work until the account is removed.

## How it works

### Shared scoring module (pure, both sides)

`src/lib/recommendations.ts` is exported through `server/app/shared/domain.ts`, like the booking rules, so mock mode and the server can't drift apart. It holds no I/O.

**Inputs:**
- `viewerId?`
- `uses`: a list of `{ userId, businessId }` rows built from the signals in call 1
- `recentBookings`: a list of `{ businessId }` rows in the 90-day window
- `saveCounts`: a map from business to number of saves
- `shops`: the approved shops, each with `categoryIds`
- `excluded`: the viewer's excluded shops as defined in call 1 (not the same set as their used shops)

**Output:** one entry per approved, non-excluded shop: `{ businessId, fit: number (0–1), reason }`. Each entry's reason comes from the first of these that applies:

1. `similar_customers`
   - Find the viewer's neighbours: other customers who share at least one used shop with them.
   - Weight each neighbour by Jaccard similarity: shared shops ÷ all shops either of them used.
   - A candidate's raw score is the sum of the similarities of the neighbours who used it.
   - It only qualifies when at least 3 distinct neighbours used it (call 2).
2. `popular_in_category`
   - The candidate matches one of the viewer's categories (call 4) and has at least one recent booking.
   - Score it by recent booking count.
3. `popular`
   - At least one recent booking, with no category match or no viewer history.
4. `none`
   - Everything else. These shops are still candidates, so a nearby shop can appear tagged "Nearest".

**Fit** is normalised so that every `similar_customers` entry ranks above every `popular_in_category` entry, which ranks above every `popular` entry, which ranks above `none`. Within a reason, fit follows the raw score. Use bands, for example 0.7–1, 0.4–0.7, 0.1–0.4 and 0. The exact numbers are the builder's.

### Server

- `GET /api/recommendations` lives in the public group and uses the session if there is one. A guest gets the same response as a customer with no history.
- The response is `{ shop: ShopSummary, fit, reason, categoryId? }[]` for every approved, non-excluded shop. `categoryId` names the category for the "Popular in Barber" tag.
- **No other user's id, and no per-user data, is ever in the response.**
- A new `server/app/services/recommendations.ts` loads the inputs with a few queries (bookings, favorites, memberships, approved shops), calls the shared scorer, then calls `getShopSummaries`.
- Add functional tests (Japa):
  - guest vs signed-in responses,
  - exclusions (saved, booked, own business, not approved),
  - the 3-neighbour threshold,
  - no other user ids in the body.

### Frontend service, mock mode and queries

- `src/services/recommendations.service.ts` has an HTTP half and a mock half. The mock half builds the same inputs from `MockDb` and calls the same scorer.
- `useRecommendationsQuery()` lives in a new `src/features/recommendations/`.
- Its key includes the session user, so it refetches on sign-in and sign-out. Saving a favorite or creating a booking invalidates it.

### Blending with distance (client only)

`rankNearby(entries, position, { limit: 8 })`, a pure function next to the scorer:

1. Compute `distanceKm` (`src/lib/geo.ts`) for each entry with coordinates.
2. Apply the radius steps (call 5).
3. Score each entry as `0.6 × fit + 0.4 × proximity`, where `proximity = 1 − distance / radius`. The weights are the builder's to tune; with `fit = 0` the order is pure distance.
4. Sort by score descending, then by distance.
5. Return the top 8.

**Tag per card:**
- `similar_customers` → "Customers like you"
- `popular_in_category` → "Popular in {category name}"
- `popular` → "Popular near you"
- `none` → "Nearest"

The card also shows the distance ("0.4 km"), formatted the way Explore already does.

Without a position (Favorites with no location), rank by fit only and leave out distances.

### Home page (`src/routes/HomePage.tsx`)

- **No location set.**
  - A "Where are you?" card sits between the hero and Categories, with "Use my location" and "Choose your area".
  - The note reads "We'll show shops near you. Your location stays on this device."
  - Choosing an area opens a small picker of areas.
  - Categories and Featured shops show as today.
- **Location set.**
  - A compact location control ("📍 Bajada · Change") sits above a **"Recommended near you"** row of `ShopCard`s with the tag and distance.
  - Then Categories and Featured shops, which show distances too.
  - The global header search is unchanged. The mockup's "location inside the search bar" is a visual shorthand; put the control where it reads best near the top of the page content.
- **Errors.** A denied or unavailable device location shows a short message and keeps "Choose your area" available. A failed query shows the existing `ErrorState` for the row only.

### Favorites page (`src/routes/FavoritesPage.tsx`)

- A **"You might also like"** section goes below the "Saved shops" list (and below the empty state when there are none).
- It uses the same query and the same blend with the stored position, up to 8 cards. Saved shops are already excluded by the server.
- It is hidden while loading. On error it shows nothing rather than a second error panel.

## Testing

- Unit tests for the scorer:
  - each reason,
  - the threshold,
  - exclusions,
  - fit ordering across reasons,
  - deterministic ties.
- Unit tests for `rankNearby`:
  - radius widening,
  - shops without coordinates,
  - no position.
- A mock service test that builds the inputs from `MockDb`.
- Component tests:
  - the home prompt → set area → row appears with tags,
  - the Favorites row,
  - persisted location surviving a reload of the store.
- Server functional tests as listed above.
- Seed data: add enough bookings and saves among the seeded customers that at least one "Customers like you" pick exists for the demo customer. Keep it realistic, with no invented ratings.

## Left to the builder

- Exact fit bands and blend weights, as long as the ordering rules above hold.
- The visual details of the tag (reuse an existing tinted pill style) and of the location control, following DESIGN.md.
- Whether the areas picker is a popover, a sheet or a select.
- Query caching times.
