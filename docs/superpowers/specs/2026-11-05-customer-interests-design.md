# Customer interests: "What are you here for?"

Date: 2026-11-05
Status: approved. Revised the same day, after the first build was reviewed in the browser: the question moved from a card on the home page into the create-account form. Everything below describes the revised design; the home card, the browser copy for guests and the guest-to-account handoff are gone.

## Why

Sign-up asks a customer for a name, email, mobile and password, and nothing about what they came for. Business sign-up and onboarding collect one to three categories for the shop, but that describes the shop, not the person booking. So every customer sees the same home page: "Recommended near you" and "Featured shops" in whatever order the ranking and the `featured` flag produce, and the category grid in catalog order. Someone who only ever books a barber scrolls past salons and spas to find one.

The ask, in the user's words: "Barbershops first, then everything else below." And on where to ask: "it should be in the create account page not in the homescreen".

## Goals

- While creating an account, a customer can say in one tap which kinds of shop they're here for, and the home page puts those shops first from then on.
- It is optional and costs nothing to skip: the form submits the same way with no pick.
- It can be changed or cleared later from the profile page, without hunting for it.
- Mock mode (`VITE_USE_MOCKS`, the default) can demo it.

## Non-goals

- A new home section. The page keeps its sections; preferred shops move to the front of the rows that already exist.
- Asking guests. Nobody is asked before they have an account; a guest sees today's home. Customers who already had an account before this shipped are not asked either; they can set it from their profile.
- A separate step after the form or after email verification. The chips sit inside the form, so there is one Create account tap and no extra screen.
- Changing search ranking or the Explore results order. Explore is filtered by the customer, not sorted by us.
- Subcategories. Only the live top-level categories are offered. "Coming soon" categories are not offered.
- Feeding the preference into the recommendation scorer (`src/lib/recommendations.ts`) or the server's `/recommendations`. Ordering happens in the browser, after the data arrives.
- Anything for merchants or admins. Business sign-up is untouched. No dashboard setting, no moderation, no analytics screen.

## Anti-goals (would count as failure even if it works)

- Shops from other categories disappear from any row. They are ordered later, never hidden.
- A customer cannot create an account because of the chips: categories failing to load must never block sign-up.
- A customer with no preference sees anything different from today.
- The account is created but the answer given with it is lost.

## Decisions made with the user

1. **Barbershops first, then everything else below.** The home page for someone who picked Barber keeps every section; barbershops lead the rows and other categories follow. Chosen from three mockups over "a new Barbershops row on top".
2. **How it looks on home (option B in the mockups):** "Recommended near you" and "Featured shops" sort preferred shops to the front, and the preferred tiles in "Browse by category" are highlighted. No new section.
3. **Asked in the create-account form, not on home.** The first build asked with a card on the home page; the user, seeing it, said it belongs on the create-account page. The chips are now a field in the customer sign-up form.
4. **Several picks allowed**, since salon-and-nails is a common pair.
5. **Saved with the account in the same request.** _(Our call, accepted.)_ A second request after sign-up could create the account and lose the answer on a flaky connection.
6. **Optional, nothing to dismiss.** _(Our call, accepted.)_ Leaving every chip off is the skip; there is no "Not now".
7. **Account only.** _(Our call, accepted.)_ With nobody asked before they have an account, the browser copy and the handoff have no job; they are removed rather than kept as dead code.
8. **It can be changed later** from the customer's account page, Profile at `/account`. _(There is no customer Settings page; `src/routes/SettingsPage.tsx` is a dev demo.)_

## Behaviour

### The question in the create-account form

`CustomerSignUpForm` in `src/features/auth/components/SignUpForms.tsx`, on `/auth/sign-up`. A new field sits after Password and before the terms checkbox, inside the same `FieldGroup`:

- **Legend:** "What are you here for?" **Description line:** "Optional. Pick what you book most and we’ll show those shops first."
- **Chips:** the existing `InterestChips`: one toggle button per live top-level category (`ServiceCategory` with no `parentId` and `status === 'active'`, in `sortOrder`), labelled with the category name and its icon, `aria-pressed` reflecting the state. Several can be on. They are `button`s with `type="button"`, so a tap never submits the form.
- **The field is a fieldset** with the legend above, so a screen reader hears the question once and then each chip; the chips are not wired through `FormField` (which labels one control).
- **Nothing selected** is the normal case and needs no action. No "Not now", no confirmation line, no summary: the form is the wrong place for a running commentary.
- **On Create account** the picked ids go with the sign-up request as `interests`. The account and the answer are created together; see Data.
- **Categories loading:** a skeleton the height of one chip row in the field's place. **Categories failed to load:** the field renders nothing and the form works as before. Sign-up never waits on the catalog.
- **The server refuses the picks** (an id that is not a live top-level category, which only happens if the catalog changed under the customer): the request fails as a whole, the form shows the message above the form like any other sign-up error, and nothing is created. _(Our call: this is the same request, so partial success is not possible; the message is the shared `interestsMessages.notOnList`.)_
- **Business sign-up** (`BusinessSignUpForm`) does not get the field.

### Home

`src/routes/HomePage.tsx` no longer renders a card, a line or a "Change" button. For a signed-in customer with an answer:

- **"Recommended near you"** (`RecommendedRow`): the stable partition `preferredFirst` is applied after `rankNearby`, so within the preferred group the nearest-and-best still lead. The "Popular in Barber" tag logic is unchanged.
- **"Featured shops"**: `preferredFirst` applied to `featured.data`.
- **"Browse by category"** (`CategoryGrid`): catalog order is kept; picked tiles are highlighted, with the visually hidden " (your pick)" suffix in the accessible name. `aria-current` is not used.
- **Favorites page** (`src/routes/FavoritesPage.tsx` also renders `RecommendedRow`) picks up the same ordering through the shared component. Nothing else re-sorts.
- A shop is "preferred" when **any** of its `categoryIds` is picked, not only the primary one.
- A guest, a customer who picked nothing, and a customer whose answer failed to load all see today's home.

### Explore

Nothing changes on the Explore page itself: a direct visit to `/explore` still starts on "All". The two links from home into Explore, the "See all" next to "Featured shops" and the "More" tile in the grid, point to `/explore?category=<slug>` when **exactly one** category is picked, and to `/explore` otherwise.

### Account page

`src/routes/ProfilePage.tsx` keeps its third `Panel`, "What you’re here for", under "Your details": the same chips, saved on tap, with the summary line ("Barber first", "Salon and Nails first", "Showing everything"). This is the only place to change the answer after sign-up, and the only place a customer who was never asked can set it. Unchanged from the first build.

### Who sees what

- The form field: anyone creating a customer account.
- The ordering and highlights: any signed-in user with an answer on their account, on the customer home. Business owners and admins browsing as customers included; their dashboards never show any of it.
- The profile panel: signed-in customers (the profile page is theirs).
- Guests: nothing.

## Data shape

### Shared type (`src/types/account.ts`), unchanged

```ts
/** What a customer said they're here for. Empty `categoryIds` with an `answeredAt` means cleared. */
export interface CustomerInterests {
  /** Live top-level category ids, in the order the catalog lists them. */
  categoryIds: ID[]
  /** When they last answered. Absent until they do. */
  answeredAt?: ISODateTime
}
```

Schema in `src/schemas/account.ts`, exported through `#shared/domain`, unchanged:

```ts
export const interestsSchema = z.object({
  categoryIds: z.array(z.string()).max(12, 'Choose fewer categories'),
})
```

Both sides also check that every id is a live top-level category (no `parentId`, `status === 'active'`) and drop duplicates; an unknown or retired id is a 422 with "Choose from the categories on the list." The stored order is catalog `sortOrder`, whatever order the client sent. On read, both sides drop ids that are no longer live and keep `answeredAt`.

### Sign-up

- `customerSignUpSchema` (`src/schemas/auth.ts`) gains `interests: z.array(z.string()).max(12, 'Choose fewer categories').default([])`. Business sign-up does not.
- `SignUpRequest` (`src/services/auth.service.ts`) gains `interests?: ID[]`, customer sign-ups only; the form sends it only when at least one chip is on.
- **Server** (`signUpValidator`, `AuthController.signUp`): `interests` is an optional array of strings, at most 12. When present and non-empty, the ids are normalised with the shared `normaliseInterestIds` against the catalog; a bad id is a 422 with the shared message, before anything is created. The user row is created with `interests: { categoryIds, answeredAt: now }`, inside the existing transaction. Absent or empty: `interests` stays `null` (unanswered). A business sign-up ignores the field.
- **Mock** (`mockAuthService.signUp`): the same, writing `store.state[id].interests`.

### Server resource and mock, unchanged

`GET`/`PUT /api/me/interests`, the nullable JSON `users.interests` column, `ProfileService.getMyInterests`/`updateMyInterests` and their mock twins stay as built. `MockAccountState.interests?` stays.

### Removed

- The browser store `src/features/interests/interests-store.ts` and its storage key `dapita-interests`.
- The home card `src/features/interests/components/InterestsCard.tsx`.
- In `useInterests()`: the guest branch, the one-time handoff, the clear-on-sign-out. The hook now reads and writes the account only, keeps the serialised save queue (rapid taps on the profile panel still need it), and for a signed-out viewer reports unanswered with a `setCategoryIds` that does nothing. `dismiss` goes with the card.

## API

| Method | Path            | Body                                 | Returns             | Notes                                                                                         |
| ------ | --------------- | ------------------------------------ | ------------------- | --------------------------------------------------------------------------------------------- |
| `POST` | `/auth/sign-up` | existing fields + `interests?: ID[]` | `SessionUser`       | Customer only. Stored as the account's interests with `answeredAt`. Bad id: 422, nothing made |
| `GET`  | `/me/interests` | none                                 | `CustomerInterests` | `{ categoryIds: [] }` with no `answeredAt` when never answered                                |
| `PUT`  | `/me/interests` | `{ categoryIds }`                    | `CustomerInterests` | Sets `answeredAt` to now. `[]` is a valid answer (clear)                                      |

## Tests

Follow the existing patterns:

- **`src/schemas/auth.test.ts`:** a customer sign-up without `interests` parses with `[]`; thirteen ids are refused with "Choose fewer categories".
- **`src/app/onboarding.test.tsx`:** a new customer taps Barber before Create account and the account's interests read `['cat_barber']`; the existing sign-up tests, which tap nothing, still pass; the field is absent on business sign-up.
- **`src/features/interests/use-interests.test.tsx`:** account read and write, the serialised queue, the stable callbacks, the load error; a signed-out viewer reads unanswered and `setCategoryIds` writes nothing. The guest, handoff and sign-out-clear tests go.
- **`src/routes/HomePage.test.tsx`:** a signed-in customer with Barber on the account sees barbershops first in Featured and Recommended, the highlighted tile and the `?category=barber` links; two picks link plain `/explore`; a guest sees no question, no "Change", today's order; a failed account load shows today's home.
- **`src/routes/ProfilePage.test.tsx`:** unchanged.
- **Server `server/tests/functional/auth.spec.ts`:** a customer sign-up with two ids stores them in catalog order with `answeredAt`, readable from `GET /api/me/interests`; a sign-up with an unknown id is 422 with the message and creates no user; a sign-up without the field reads back `{ categoryIds: [] }`.
- **e2e (`e2e/app.spec.ts`):** the discovery journey loses the home-card steps and clicks the plain "Barber" tile again. The onboarding journey taps Barber before Create account and, after Continue and a visit to home, finds the tile named "Barber (your pick)".

## Left to the builder

- Exact look of the chips inside the form, within `DESIGN.md` and the `FieldSet`/`FieldLegend`/`FieldDescription` components already in `src/components/ui/field.tsx`.
- How the form reads the catalog (`useCategoriesQuery`) and what the skeleton looks like.
- How much of the save queue in `useInterests` survives once the guest branch is gone, as long as the serialisation tests still pass.

## Builder check

First build, 2026-11-05: "nothing important left". The revision was checked against the code by the author while reading the sign-up form, the sign-up hook, the server controller and the hook; no open questions.
