# Customer interests: "What are you here for?"

Date: 2026-11-05
Status: reviewed, awaiting approval

## Why

Sign-up asks a customer for a name, email, mobile and password, and nothing about what they came for. Business sign-up and onboarding collect one to three categories for the shop, but that describes the shop, not the person booking. So every customer sees the same home page: "Recommended near you" and "Featured shops" in whatever order the ranking and the `featured` flag produce, and the category grid in catalog order. Someone who only ever books a barber scrolls past salons and spas to find one.

The ask, in the user's words: "Barbershops first, then everything else below."

## Goals

- A customer can say, in one tap, which kinds of shop they're here for, and the home page puts those shops first from then on.
- It works for visitors who haven't signed up yet, because most people browse before they create an account, and the answer follows them onto the account when they do.
- It can be changed or cleared later without hunting for it.
- Mock mode (`VITE_USE_MOCKS`, the default) can demo it.

## Non-goals

- A new home section. The page keeps its sections; preferred shops move to the front of the rows that already exist.
- Changing search ranking or the Explore results order. Explore is filtered by the customer, not sorted by us.
- Asking during sign-up or right after email verification. The question lives on the home page, where the answer is used.
- Subcategories. Only the live top-level categories are offered (today: Barber, Salon, Spa & Massage, Nails). "Coming soon" categories are not offered.
- Feeding the preference into the recommendation scorer (`src/lib/recommendations.ts`) or the server's `/recommendations`. Ordering happens in the browser, after the data arrives.
- Anything for merchants or admins. No dashboard setting, no moderation, no analytics screen.

## Anti-goals (would count as failure even if it works)

- Shops from other categories disappear from any row. They are ordered later, never hidden.
- The question comes back after the customer dismissed it, or interrupts booking, search or any other page.
- A customer with no preference sees anything different from today.
- A guest's answer is lost when they sign up, or overwrites an answer they already gave on the account.

## Decisions made with the user

1. **Barbershops first, then everything else below.** The home page for someone who picked Barber keeps every section; barbershops lead the rows and other categories follow. Chosen from three mockups over "a new Barbershops row on top".
2. **How it looks on home (option B in the mockups):** "Recommended near you" and "Featured shops" sort preferred shops to the front, and the preferred tiles in "Browse by category" are highlighted. No new section.
3. **Asked as a light card on the home page, not a screen of its own.** _(Our call, accepted.)_ Verification happens through an email link, often on another device or later, so a screen wedged in after it would be skipped. The card sits where the answer matters and works for guests too.
4. **Several picks allowed**, since salon-and-nails is a common pair.
5. **Tapping a chip saves immediately**; the rows re-sort in place with a one-line confirmation. No Save button.
6. **"Not now" dismisses it for good.** No nagging.
7. **Guests get it saved in the browser**; the first time they sign in or sign up with a local answer and no account answer, it is copied onto the account.
8. **It can be changed later** from the customer's account page. _(The conversation said "Settings"; the customer-facing page in this app is Profile at `/account`. Builder note: there is no customer Settings page; `src/routes/SettingsPage.tsx` is a dev demo.)_

## Behaviour

### The card on home

`src/routes/HomePage.tsx`. The card renders directly under the hero and above the location prompt or "Recommended near you", for anyone on the customer home whose interests are **unanswered at the moment the page mounts**: never picked and never dismissed, on the account when signed in, in this browser when not.

- **Title:** "What are you here for?" **Line under it:** "Pick what you book most and we'll show those shops first."
- **Chips:** one toggle button per live top-level category (`ServiceCategory` with no `parentId` and `status === 'active'`, in `sortOrder`), labelled with the category name and its icon, `aria-pressed` reflecting the state. Several can be on. The chips are `button`s, never links, so they don't collide with the category grid's links in tests.
- **"Not now":** a quiet link-style button. Saves an empty answer and hides the card at once.
- **On the first tap** the answer is saved (see Data) and the rows below re-sort in place. The card stays for the rest of this visit so the customer can add or remove a chip, and shows a confirmation line under the chips: "Barber first. Change this any time from your profile." With several picks, names joined with commas and "and": "Salon and Nails first." With all chips off again: "Showing everything." The names are the category names as the catalog spells them.
- **Next visit** (the page mounts with the answer already saved): no card. In its place a single quiet line under the hero, only when at least one category is picked: "Barber first · Change". "Change" reopens the chips inline, in the same card form, with the same save-on-tap behaviour and a "Done" button that collapses it back to the line. _(Our call: this gives guests, who have no account page, a way back in, and makes the setting discoverable without nagging. Dismissed-with-nothing-picked shows no line at all.)_
- **Saving fails** (server error, offline): the chip reverts, and the project's standard error toast shows (`showErrorToast` default on the mutation). The card does not disappear on failure.
- **While categories are loading** the card renders a skeleton of the same height; if categories fail to load the card renders nothing (the grid's own error state already covers it).

### How the home rows change

A pure helper, `preferredFirst<T>(items: readonly T[], interests: ReadonlySet<ID>, categoryIdsOf: (item: T) => readonly ID[]): T[]` in `src/lib/interests.ts`: a **stable partition**. _(The accessor is there because `RecommendedRow` holds `categoryIds` on `entry.shop`, not on the entry.)_ Items whose `categoryIds` intersect `interests` come first, in their existing order; the rest follow, in their existing order. With an empty set it returns the input order.

- **"Recommended near you"** (`RecommendedRow`, `src/features/recommendations/components/RecommendedRow.tsx`): applied after `rankNearby`, so within the preferred group the nearest-and-best still lead. The "Popular in Barber" tag logic is unchanged.
- **"Featured shops"**: applied to `featured.data`.
- **"Browse by category"** (`CategoryGrid`): catalog order is kept. Tiles whose category is picked get a highlighted look (the builder's call within `DESIGN.md`; the mockup used a ring in the accent colour) and `aria-current="true"` is **not** used, since nothing is "current"; a visually hidden "Your pick" suffix in the tile's accessible name is fine.
- **Favorites page** (`src/routes/FavoritesPage.tsx` also renders `RecommendedRow`) picks up the same ordering through the shared component. Nothing else re-sorts.
- A shop is "preferred" when **any** of its `categoryIds` is picked, not only the primary one.

### Explore

Nothing changes on the Explore page itself: a direct visit to `/explore` still starts on "All". The two links from home into Explore, the "See all" next to "Featured shops" and the "More" tile in the grid, point to `/explore?category=<slug>` when **exactly one** category is picked, and to `/explore` otherwise. _(Our call. Preselecting inside Explore would need a "first time only" rule and would fight the customer's own "All" tap; a link that carries the pick gets the same effect from home with no trap.)_

### Account page

`src/routes/ProfilePage.tsx` gains a third `Panel`, "What you're here for", under "Your details": the same chips with the same save-on-tap behaviour, and the same confirmation line. No form, no Save. This panel only exists for signed-in users, so it reads and writes the account.

### Guest to account

- Signed out: the answer lives in this browser, in a small persisted store (same `zustand/persist` pattern as `src/hooks/use-user-location.ts`), key `dapita-interests`, holding `{ categoryIds, answeredAt }`.
- Signed in: the answer lives on the account, through the API below, cached in TanStack Query under `accountKeys`.
- **Handoff:** when a session appears (sign-in or sign-up success, or app load with an existing session) and the account's interests are **unanswered** while the browser holds an **answered** one, the browser's answer is written to the account once, then the browser copy is cleared. If the account already has an answer, the browser copy is discarded without a write. The handoff runs from one place, a hook used by the home page and the account page, not from the sign-in form. A failed handoff write is logged and retried on the next mount; nothing is shown to the user.
- **Sign out** does not restore a browser copy: after signing out, the visitor is a new guest with no answer, and the card shows again.
- Which store the UI reads is decided by the session: signed in reads the account, signed out reads the browser. The hook that exposes `{ interests, answered, setCategoryIds, dismiss, isPending }` hides this from the components.

### Who sees it

Anyone on the customer home, including a business owner who browses as a customer; their dashboard (`/business/...`) never shows it. Admins the same. Email verification is not required to answer.

## Data shape

### Shared type (`src/types/account.ts`)

```ts
/** What a customer said they're here for (home page card). Empty `categoryIds` with an `answeredAt` means "Not now" or cleared. */
export interface CustomerInterests {
  /** Live top-level category ids, in the order the catalog lists them. */
  categoryIds: ID[]
  /** When they last answered, picked or dismissed. Absent until they do. */
  answeredAt?: ISODateTime
}
```

Schema in `src/schemas/account.ts`, exported through `#shared/domain`:

```ts
export const interestsSchema = z.object({
  categoryIds: z.array(z.string()).max(12, 'Choose fewer categories'),
})
```

Both sides also check that every id is a live top-level category (no `parentId`, `status === 'active'`) and drop duplicates; an unknown or retired id is a 422 with "Choose from the categories on the list." The stored order is catalog `sortOrder`, whatever order the client sent.

**Reading a stale answer.** An admin can retire a category later (`server/app/services/admin_categories.ts`). On read, both sides drop ids that are no longer live and keep `answeredAt`, so the customer stays "answered", the card doesn't come back, and the next save (which sends the full set) isn't refused for an id they can no longer see. _(Our call, after the builder check.)_

### Server

- Migration `add_interests_to_users`: `json('interests').nullable()` on `users`. `null` means unanswered. The model column is `@column(json) declare interests: CustomerInterests | null`.
- `server/app/services/profile.ts` gains `getMyInterests(user)` and `updateMyInterests(user, input)`; the controller is `ProfileController` (`interests`, `updateInterests`), under the authenticated `me/` group next to `me/profile`.
- `toSessionUser` and `MyProfile` do not change. Interests are their own small resource so the home page can load them with the rest of its queries and the session payload stays as it is.

### Mock mode

- `MockAccountState` (`src/services/mock/accounts.ts`) gains `interests?: CustomerInterests`. No `MOCK_ACCOUNTS_VERSION` bump: the field is optional and absent means unanswered. Seeded demo accounts stay unanswered so the demo shows the card.
- `mockProfileService` gains the two methods, validating ids against the mock catalog with the same message.

## API (authenticated, under `/api/me`)

| Method | Path         | Body              | Returns             | Notes                                                            |
| ------ | ------------ | ----------------- | ------------------- | ---------------------------------------------------------------- |
| `GET`  | `/interests` | none              | `CustomerInterests` | `{ categoryIds: [] }` with no `answeredAt` when never answered   |
| `PUT`  | `/interests` | `{ categoryIds }` | `CustomerInterests` | Sets `answeredAt` to now. `[]` is a valid answer (dismiss/clear) |

Frontend: `ProfileService` (`src/services/profile.service.ts`) gains `getMyInterests()` and `updateMyInterests(categoryIds)`; `src/features/account/api/queries.ts` gains `useMyInterestsQuery()` (enabled only with a session) and `useUpdateInterestsMutation()` which writes the result into the cache on success. The mutation is optimistic on the chips (the chip flips at once) and rolls back on error. Quick successive taps are serialised so the latest full set is what lands, and a rollback never undoes a later pick. _(Our call, after the builder check.)_

## Tests

Follow the existing patterns:

- **`src/lib/interests.test.ts`:** stable partition, empty set, any-category match, no mutation of the input.
- **`src/routes/HomePage.test.tsx`:** card shows for a guest with no answer; tapping Barber saves locally and moves barbershops to the front of Featured; "Not now" hides the card and nothing re-sorts; a return visit with an answer shows the line and no card; "Change" reopens the chips; signed-in customer saves to the account (mock) and the home shows it on reload; a signed-in customer with an account answer sees no card even if the browser holds one; handoff copies a guest answer onto a fresh account once and clears the local copy; "See all" carries `?category=barber` with exactly one pick and plain `/explore` with two.
- **`src/routes/ProfilePage.test.tsx`:** the panel shows the saved picks, toggling saves, clearing all shows "Showing everything."
- **`src/services/profile.service.test.ts`** (or the existing mock service tests): unknown id refused with the message, duplicates dropped, order normalised to catalog order.
- **Server functional `server/tests/functional/me_interests.spec.ts`:** unauthenticated 401; GET before any answer returns `{ categoryIds: [] }` without `answeredAt`; PUT valid ids stores them in catalog order with `answeredAt`; PUT `[]` is accepted and sets `answeredAt`; subcategory id, retired id and unknown id are 422 with the message; duplicates collapse; a second PUT replaces the first.
- **e2e (`e2e/app.spec.ts`):** the customer journeys land on home, which now shows the card. Run the suite; existing locators that target category **links** must keep matching (the chips are buttons). Add one step to the discovery journey: tap Barber, expect the first featured card to be a barbershop, reload, expect the line "Barber first · Change" and no card. If the suite needs a reset between tests, the local store key is `dapita-interests`.

## Left to the builder

- Exact look of the card, chips, confirmation line and highlighted tiles, within `DESIGN.md` and the existing components (`Panel`, `Button`, the chip pattern used by `ExploreFilters` if one fits).
- Where the hook, store and components live (`src/features/interests/` is a reasonable home; `src/lib/interests.ts` for the pure helper so the server can share it if that's ever wanted).
- How the "mounted unanswered" snapshot is held so the card doesn't vanish mid-visit after the first tap.
- Whether the account page panel and the home card share one component with a `variant`, or are two small pieces.
- The skeleton for the card while categories load.

## Builder check

Run 2026-11-05: "nothing important left". The reviewer confirmed the file and layout claims against the code. Three small calls it would have made were folded in above: the accessor on `preferredFirst`, dropping retired ids on read, and serialising rapid saves.
