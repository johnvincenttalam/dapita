# Customer Interests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A home-page card asks "What are you here for?"; the answer (live top-level category ids) is kept in the browser for guests and on the account for signed-in customers, and the home rows put those shops first.

**Architecture:** One pure module (`src/lib/interests.ts`) holds the stable partition, id normalisation and the copy, and is shared with the server through `#shared/domain`. Interests are a small resource, `GET`/`PUT /api/me/interests`, stored as a nullable JSON column on `users`, with a mock twin on `MockAccountState`. A single hook, `useInterests()`, decides between the browser store and the account, serialises saves, and performs the one-time guest-to-account handoff; the card, the rows and the profile panel all read it.

**Tech Stack:** React 19, TanStack Query, zustand/persist, Zod, Vitest + Testing Library; AdonisJS 6 + Lucid + PostgreSQL with Japa; Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-05-customer-interests-design.md`

## Global Constraints

- Copy is verbatim from the spec: title "What are you here for?", line "Pick what you book most and we'll show those shops first.", dismiss "Not now", reopen "Change", close "Done", summary "Barber first" / "Salon and Nails first" / "Salon, Spa & Massage and Nails first" / "Showing everything", refusal "Choose from the categories on the list.", profile panel title "What you're here for".
- Chips are `<button aria-pressed>` elements, never links; the category grid keeps its links. Nothing is ever hidden from a row; `preferredFirst` is a stable partition.
- Only live top-level categories are offered or accepted: no `parentId`, `status === 'active'`, ordered by `sortOrder`. Stored ids are deduped and in catalog order.
- Shared code lives in `src/lib` or `src/schemas` and is re-exported from `server/app/shared/domain.ts`; never duplicate logic on the server.
- Browser store key `dapita-interests`; anything unreadable there counts as unanswered.
- Frontend checks: `npm run check` (typecheck, lint, Prettier, Vitest). Server checks from `server/`: `npm run typecheck && npm run lint && npm test`. Run `npx prettier --write` on touched frontend files before `npm run check` (ESLint doesn't run Prettier).
- Commit messages: one plain imperative sentence, with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Work on branch `customer-interests` off `main`.

## Review Focus

1. A second person signs in on the same browser after the first signed out: they must see their own state, never the first person's picks (Task 3 hook test "sign-out leaves a fresh guest").
2. Storage blocked or corrupted (`dapita-interests` holds junk): the guest card still shows and works for the visit (Task 3 store test).
3. The account's interests request fails for a signed-in customer: the home page renders without the card and with today's ordering, no crash, no toast loop (Task 4 test).
4. A pick whose category an admin later retired: the home links fall back to plain `/explore`, the summary names only live categories, saves still succeed (Task 1 `exploreHrefFor` test, Task 2 server read test).
5. Two taps faster than the network: the last full set lands and an older failure never undoes a later pick (Task 3 serialisation test).

---

### Task 1: Shared type, schema, pure helpers and the mock service

**Files:**

- Modify: `src/types/account.ts` (add `CustomerInterests`)
- Modify: `src/schemas/account.ts` (add `interestsSchema`)
- Create: `src/lib/interests.ts`
- Test: `src/lib/interests.test.ts`
- Modify: `src/services/mock/accounts.ts` (`MockAccountState.interests?`)
- Modify: `src/services/profile.service.ts` (two methods, HTTP + mock)
- Test: `src/services/profile.service.test.ts` (create if absent, next to the other `*.service.test.ts` files)
- Modify: `server/app/shared/domain.ts` (re-exports)

**Interfaces:**

- Consumes: `ServiceCategory` (`src/types/catalog.ts`), `ID`, `ISODateTime`, `readMockDb().categories`, `readMockAccounts`/`updateMockAccounts`, `getMockSessionUser`, `ApiError`.
- Produces:

  ```ts
  // src/types/account.ts
  export interface CustomerInterests {
    categoryIds: ID[]
    answeredAt?: ISODateTime
  }

  // src/schemas/account.ts
  export const interestsSchema = z.object({ categoryIds: z.array(z.string()).max(12, 'Choose fewer categories') })
  export type InterestsInput = z.infer<typeof interestsSchema>

  // src/lib/interests.ts
  export const interestsMessages = { notOnList: 'Choose from the categories on the list.' } as const
  /** Top-level, active, by sortOrder. */
  export function liveInterestCategories(categories: readonly ServiceCategory[]): ServiceCategory[]
  /** Deduped and in catalog order; null when any id isn't a live top-level category. */
  export function normaliseInterestIds(ids: readonly ID[], categories: readonly ServiceCategory[]): ID[] | null
  /** Drops ids that are no longer live, keeps answeredAt. */
  export function dropRetiredInterests(
    interests: CustomerInterests,
    categories: readonly ServiceCategory[],
  ): CustomerInterests
  /** Stable partition: items with any picked category first, each group in its input order. */
  export function preferredFirst<T>(
    items: readonly T[],
    interests: ReadonlySet<ID>,
    categoryIdsOf: (item: T) => readonly ID[],
  ): T[]
  /** 'Barber first' | 'Salon and Nails first' | 'Salon, Spa & Massage and Nails first' | 'Showing everything' */
  export function interestsSummary(names: readonly string[]): string
  /** '/explore?category=<slug>' when exactly one live pick, else '/explore'. */
  export function exploreHrefFor(categoryIds: readonly ID[], categories: readonly ServiceCategory[]): string

  // src/services/profile.service.ts (ProfileService)
  getMyInterests: () => Promise<CustomerInterests>
  updateMyInterests: (categoryIds: ID[]) => Promise<CustomerInterests>
  ```

  HTTP: `apiClient.get<CustomerInterests>('/me/interests')`, `apiClient.put<CustomerInterests>('/me/interests', { categoryIds })`.

- [ ] **Step 1: Write the failing helper tests** in `src/lib/interests.test.ts`, using `seedCategories` from `@/services/mock/seed/catalog` (ids `cat_barber`, `cat_salon`, `cat_spa`, `cat_nails` live; `cat_gowns` is `coming_soon`; `sub_styling` is a subcategory):

```ts
it('lists live top-level categories in sort order', () => {
  expect(liveInterestCategories(seedCategories).map((c) => c.id)).toEqual([
    'cat_barber',
    'cat_salon',
    'cat_spa',
    'cat_nails',
  ])
})
it('normalises to catalog order without duplicates', () => {
  expect(normaliseInterestIds(['cat_nails', 'cat_barber', 'cat_nails'], seedCategories)).toEqual([
    'cat_barber',
    'cat_nails',
  ])
})
it.each([['sub_styling'], ['cat_gowns'], ['nope']])('refuses %s', (id) => {
  expect(normaliseInterestIds([id], seedCategories)).toBeNull()
})
it('drops retired ids and keeps answeredAt', () => {
  expect(dropRetiredInterests({ categoryIds: ['cat_barber', 'gone'], answeredAt: 'T' }, seedCategories)).toEqual({
    categoryIds: ['cat_barber'],
    answeredAt: 'T',
  })
})
it('puts preferred items first and keeps both orders', () => {
  const items = [
    { id: 'a', c: ['x'] },
    { id: 'b', c: ['y', 'z'] },
    { id: 'c', c: ['x'] },
    { id: 'd', c: ['y'] },
  ]
  expect(preferredFirst(items, new Set(['y']), (i) => i.c).map((i) => i.id)).toEqual(['b', 'd', 'a', 'c'])
  expect(preferredFirst(items, new Set(), (i) => i.c)).toEqual(items)
  expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
})
it.each([
  [[], 'Showing everything'],
  [['Barber'], 'Barber first'],
  [['Salon', 'Nails'], 'Salon and Nails first'],
  [['Salon', 'Spa & Massage', 'Nails'], 'Salon, Spa & Massage and Nails first'],
])('summarises %j', (names, line) => expect(interestsSummary(names)).toBe(line))
it('links Explore to the single live pick only', () => {
  expect(exploreHrefFor(['cat_barber'], seedCategories)).toBe('/explore?category=barber')
  expect(exploreHrefFor(['cat_barber', 'cat_nails'], seedCategories)).toBe('/explore')
  expect(exploreHrefFor(['gone'], seedCategories)).toBe('/explore')
  expect(exploreHrefFor([], seedCategories)).toBe('/explore')
})
```

- [ ] **Step 2: Write the failing mock service tests** in `src/services/profile.service.test.ts` (sign in with `localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)` in `beforeEach` after `localStorage.clear()`; mock `delay` as the other service tests do):

```ts
it('starts unanswered', async () => {
  expect(await profileService.getMyInterests()).toEqual({ categoryIds: [] })
})
it('saves deduped ids in catalog order with answeredAt', async () => {
  const saved = await profileService.updateMyInterests(['cat_nails', 'cat_barber', 'cat_nails'])
  expect(saved.categoryIds).toEqual(['cat_barber', 'cat_nails'])
  expect(saved.answeredAt).toBeTruthy()
  expect(await profileService.getMyInterests()).toEqual(saved)
})
it('accepts an empty answer', async () => {
  expect((await profileService.updateMyInterests([])).answeredAt).toBeTruthy()
})
it('refuses an id that is not on the list', async () => {
  await expect(profileService.updateMyInterests(['sub_styling'])).rejects.toMatchObject({
    status: 422,
    message: 'Choose from the categories on the list.',
  })
})
it('drops a retired id on read', async () => {
  await profileService.updateMyInterests(['cat_barber', 'cat_nails'])
  updateMockDb((db) => {
    db.categories.find((c) => c.id === 'cat_nails')!.status = 'hidden'
  })
  expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_barber'])
})
it('needs a session', async () => {
  localStorage.removeItem(MOCK_SESSION_KEY)
  await expect(profileService.getMyInterests()).rejects.toMatchObject({ status: 401 })
})
```

- [ ] **Step 3: Run both files to verify they fail**

Run: `npx vitest run src/lib/interests.test.ts src/services/profile.service.test.ts`
Expected: FAIL (module and methods missing).

- [ ] **Step 4: Implement** the type, schema, `src/lib/interests.ts`, the `MockAccountState.interests?: CustomerInterests` field, and the two service methods. The mock read is `readMockAccounts().state[id]?.interests ?? { categoryIds: [] }` passed through `dropRetiredInterests` with `readMockDb().categories`; the mock write normalises with the same categories, throws `new ApiError(interestsMessages.notOnList, 422)` on `null`, stores `{ categoryIds, answeredAt: new Date().toISOString() }` via `updateMockAccounts`, and returns a clone. `interestsSummary` joins with ", " and a final " and ". Add to `server/app/shared/domain.ts`: `export { interestsSchema } from '@/schemas/account'` (alongside `myProfileSchema`) and `export { dropRetiredInterests, interestsMessages, normaliseInterestIds } from '@/lib/interests'`.

- [ ] **Step 5: Run the checks**

Run: `npx vitest run src/lib/interests.test.ts src/services/profile.service.test.ts && npx prettier --write src/lib/interests.ts src/lib/interests.test.ts src/services/profile.service.ts src/services/profile.service.test.ts src/types/account.ts src/schemas/account.ts src/services/mock/accounts.ts && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src server/app/shared/domain.ts
git commit -m "Add the customer interests type, helpers and mock service"
```

---

### Task 2: Server resource `GET`/`PUT /api/me/interests`

**Files:**

- Create: `server/database/migrations/1761900000012_add_interests_to_users.ts`
- Modify: `server/app/models/user.ts` (column)
- Modify: `server/app/services/profile.ts` (two functions)
- Modify: `server/app/controllers/profile_controller.ts` (two actions)
- Modify: `server/start/routes.ts` (two routes in the signed-in group, next to `me/profile`)
- Test: `server/tests/functional/me_interests.spec.ts`
- Regenerate and commit `server/.adonisjs` if the route change alters it (it did for earlier features).

**Interfaces:**

- Consumes: `interestsSchema`, `normaliseInterestIds`, `dropRetiredInterests`, `interestsMessages`, `CustomerInterests` from `#shared/domain`; `validateWith`, `formBody` from `#helpers/validate`; `json` from `#models/columns`; `toCategoryData` from `#services/catalog`; `Category` model; `ApiError`.
- Produces:

  ```ts
  // server/app/models/user.ts
  @column(json) declare interests: CustomerInterests | null
  // server/app/services/profile.ts
  export async function getMyInterests(user: User): Promise<CustomerInterests>
  export async function updateMyInterests(user: User, input: unknown): Promise<CustomerInterests>
  // ProfileController: interests(ctx), updateInterests(ctx)
  // routes: router.get('me/interests', [ProfileController, 'interests']); router.put('me/interests', [ProfileController, 'updateInterests'])
  ```

  Categories for validation and the read-time drop come from `Category.all()` mapped with `toCategoryData` (not `listPublicCategories`, which omits hidden ones and would let a hidden id slip through as "unknown" rather than "retired"; both are refused either way, but the drop-on-read needs the full list).

- [ ] **Step 1: Write the failing functional tests** in `server/tests/functional/me_interests.spec.ts`, following `favorites.spec.ts` (`withGlobalTransaction`, `userByEmail(customerEmail)`, `.loginAs(user)`; `Category` from `#models/category` for the retire step):

```ts
test('requires a session', ...)                       // GET → 401
test('starts unanswered', ...)                         // GET → 200, body deepEqual { categoryIds: [] } (no answeredAt key)
test('stores live ids in catalog order with answeredAt', ...)
  // PUT { categoryIds: ['cat_nails', 'cat_barber', 'cat_nails'] } → 200, categoryIds ['cat_barber','cat_nails'], isString(answeredAt); GET returns the same
test('accepts an empty answer as dismissed', ...)      // PUT { categoryIds: [] } → 200 with answeredAt
test('replaces the previous answer', ...)              // PUT barber, PUT nails → GET shows ['cat_nails'] only
test.each(['sub_styling', 'cat_gowns', 'nope'])('refuses %s', ...)
  // PUT → 422, body.message === 'Choose from the categories on the list.'
test('drops a retired category on read', ...)
  // PUT ['cat_barber','cat_nails']; await Category.query().where('id','cat_nails').update({ status: 'hidden' }); GET → ['cat_barber'] with answeredAt kept
test('rejects a malformed body', ...)                  // PUT { categoryIds: 'cat_barber' } → 422
```

- [ ] **Step 2: Run to verify they fail**

Run (from `server/`): `node ace test --files tests/functional/me_interests.spec.ts`
Expected: FAIL (404 on the routes).

- [ ] **Step 3: Implement** the migration (`this.schema.alterTable('users', (t) => t.json('interests').nullable())`, `down` drops it), the model column, the service functions (`updateMyInterests`: `validateWith(interestsSchema, input)`, normalise, `null` → `throw new ApiError(interestsMessages.notOnList, 422)`, merge `{ interests: { categoryIds, answeredAt: now }, updatedAt: now }`, save, return through `getMyInterests`), the controller actions and the routes. Run the migration against the dev and test databases as the earlier migration tasks did (`node ace migration:run`; the test bootstrap migrates on its own if that's how `merchant_service_photos.spec.ts` got its column; check `server/tests/bootstrap.ts`).

- [ ] **Step 4: Run the server checks**

Run (from `server/`): `npm run typecheck && npm run lint && npm test`
Expected: PASS, with the new spec's tests listed.

- [ ] **Step 5: Smoke it against the dev API** (the user's `npm run dev:all` is running; the API binds `[::1]:3333`): sign in as `customer@example.com` / `password123` through `POST /api/auth/sign-in` with a cookie jar, `PUT /api/me/interests` with `{"categoryIds":["cat_barber"]}` → 200, `GET /api/me/interests` → same body with `answeredAt`. Record the two responses in the task report.

- [ ] **Step 6: Commit**

```bash
git add server
git commit -m "Store what a customer is here for behind GET and PUT /api/me/interests"
```

---

### Task 3: Browser store, account queries and the `useInterests` hook

**Files:**

- Create: `src/features/interests/interests-store.ts`
- Modify: `src/features/account/api/queries.ts` (key, query, mutation)
- Create: `src/features/interests/use-interests.ts`
- Test: `src/features/interests/use-interests.test.tsx`

**Interfaces:**

- Consumes: `profileService.getMyInterests/updateMyInterests` (Task 1), `useSession()` from `@/features/auth/api/queries` (`{ user, isPending }`), `accountKeys`, `sessionKeys`, `CustomerInterests`, `ID`.
- Produces:

  ```ts
  // interests-store.ts
  export const INTERESTS_STORAGE_KEY = 'dapita-interests'
  interface LocalInterestsState { interests: CustomerInterests; set: (categoryIds: ID[]) => void; clear: () => void }
  export const useLocalInterests = create<LocalInterestsState>()(persist(..., { name: INTERESTS_STORAGE_KEY, storage: createJSONStorage(() => localStorage), partialize: ({ interests }) => ({ interests }), merge: /* anything that isn't { interests: { categoryIds: string[] } } → unanswered */ }))

  // features/account/api/queries.ts
  accountKeys.interests: () => [...accountKeys.all, 'interests'] as const
  export function useMyInterestsQuery(enabled: boolean)   // queryFn profileService.getMyInterests, staleTime: Infinity
  export function useUpdateInterestsMutation()            // mutationFn (ids: ID[]) => profileService.updateMyInterests(ids); onSuccess writes accountKeys.interests(); meta.showErrorToast default (on)

  // use-interests.ts
  export interface InterestsState {
    interests: CustomerInterests
    /** True once picked or dismissed, wherever it is stored. */
    answered: boolean
    /** True while the session or the account's answer is still loading. */
    isPending: boolean
    /** True when a signed-in customer's answer could not be loaded; the UI shows nothing. */
    isError: boolean
    setCategoryIds: (categoryIds: ID[]) => void
    dismiss: () => void   // = setCategoryIds([])
  }
  export function useInterests(): InterestsState
  ```

  Behaviour pinned by the tests below: signed out reads and writes the browser store synchronously; signed in writes the account optimistically (`setQueryData` at once, request after), requests go out one at a time, and a response (success or error) that belongs to anything but the most recent request is ignored, so a late failure never rolls back a later pick; on the latest request's failure the cache reverts to the server's last known value. Handoff: once per signed-in session (a ref keyed by `user.id`), when the account query has settled unanswered and the browser store is answered, call the mutation with the browser's ids and clear the store on success; when both are answered, clear the store without a request.

- [ ] **Step 1: Write the failing tests** in `src/features/interests/use-interests.test.tsx` with `renderHook` wrapped in the test providers (see how `src/test/render.tsx` builds its `QueryClientProvider`; export a small `wrapper` from there if one isn't already exported). Mock `delay` as the other tests do. Sign in by setting `MOCK_SESSION_KEY` to `mockUsers.customer.id` before rendering.

```ts
it('a guest starts unanswered and saves to the browser', ...)
  // answered false → act(setCategoryIds(['cat_barber'])) → interests.categoryIds ['cat_barber'], answered true, JSON.parse(localStorage.getItem('dapita-interests')).state.interests.categoryIds equals ['cat_barber']
it('junk in storage counts as unanswered', ...)
  // localStorage.setItem('dapita-interests', '{nope') → answered false, no throw
it('a signed-in customer reads and writes the account', ...)
  // await waitFor(isPending false); setCategoryIds(['cat_nails']); await waitFor(() => profileService.getMyInterests() resolves with ['cat_nails'])
it('copies a guest answer onto a fresh account once and clears the browser copy', ...)
  // local store set ['cat_barber'] (via useLocalInterests.getState().set) → sign in → await waitFor(interests.categoryIds ['cat_barber'] from the account) → localStorage item's interests has no answeredAt; spy updateMyInterests called once
it('keeps the account answer when both are answered', ...)
  // account already ['cat_salon'] (call profileService.updateMyInterests while signed in before rendering), local ['cat_barber'] → interests ['cat_salon']; spy updateMyInterests not called; local cleared
it('sign-out leaves a fresh guest', ...)
  // signed in, answered ['cat_salon']; then localStorage.removeItem(MOCK_SESSION_KEY) and queryClient.setQueryData(sessionKeys.current, null) → answered false, categoryIds []
it('the last of two quick taps wins even when the first fails late', ...)
  // signed in; spy updateMyInterests: first call returns a promise that rejects after the second resolves; setCategoryIds(['cat_barber']) then setCategoryIds(['cat_barber','cat_nails']) → final interests ['cat_barber','cat_nails'] and it stays after both settle
it('reports an error instead of asking when the account answer cannot load', ...)
  // spy getMyInterests rejects ApiError 500 → isError true, answered false
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/features/interests/use-interests.test.tsx`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement** the store, the query and mutation, and the hook as in Interfaces. For the serialisation, a `useRef` holding `{ seq: number; chain: Promise<void> }` is enough: each `setCategoryIds` bumps `seq`, writes the cache, and appends to `chain` a step that skips if `seq` moved on, otherwise awaits the mutation and, on error for the still-latest `seq`, invalidates `accountKeys.interests()`.

- [ ] **Step 4: Run the checks**

Run: `npx vitest run src/features/interests src/services/profile.service.test.ts && npx prettier --write src/features/interests src/features/account/api/queries.ts && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Keep a customer's interests in the browser or on the account behind one hook"
```

---

### Task 4: The home card, highlighted tiles and preferred-first rows

**Files:**

- Create: `src/features/interests/components/InterestChips.tsx`
- Create: `src/features/interests/components/InterestsCard.tsx`
- Modify: `src/features/discovery/components/CategoryGrid.tsx` (`highlighted`, `moreTo`)
- Modify: `src/features/recommendations/components/RecommendedRow.tsx` (partition after `rankNearby`)
- Modify: `src/routes/HomePage.tsx` (card, featured partition, links)
- Test: `src/routes/HomePage.test.tsx`

**Interfaces:**

- Consumes: `useInterests()` (Task 3), `liveInterestCategories`, `preferredFirst`, `interestsSummary`, `exploreHrefFor` (Task 1), `useCategoriesQuery`, `categoryIcons`, `Button`, `Skeleton`, `Panel` or the `card-surface` class.
- Produces:

  ```tsx
  export function InterestChips({
    categories,
    selected,
    onToggle,
    disabled,
  }: {
    categories: ServiceCategory[]
    selected: ReadonlySet<ID>
    onToggle: (id: ID) => void
    disabled?: boolean
  })
  // one <Button type="button" shape="pill" size="sm" aria-pressed={on} variant={on ? 'default' : 'outline'}> per category, icon + name

  export function InterestsCard({ className }: { className?: string })
  // Renders nothing while useInterests().isPending, on isError, or when categories errored; a Skeleton of the card's height while categories load.
  // `open` state: undefined until isPending is false, then initialised once to !answered. Shows the card when open, the quiet line when closed and categoryIds.length > 0, nothing when closed and empty.
  // Card: <h2>What are you here for?</h2>, <p>Pick what you book most and we'll show those shops first.</p>, <InterestChips/>, then either
  //   a "Not now" link-style button (only while !answered) that calls dismiss() and sets open=false, or
  //   when answered: <p role="status">{interestsSummary(names)}. {user ? 'Change this any time from your profile.' : 'Change this any time from this page.'}</p> and a "Done" outline button that sets open=false.
  // Line: <p>{interestsSummary(names)} · <button>Change</button></p>; Change sets open=true.
  // names = live categories whose id is picked, in catalog order.

  // CategoryGrid
  export function CategoryGrid({
    categories,
    highlighted,
    moreTo = '/explore',
    className,
  }: {
    categories: ServiceCategory[]
    highlighted?: ReadonlySet<ID>
    moreTo?: string
    className?: string
  })
  // a highlighted tile's circle gets `ring-2 ring-primary` and its label gains <span className="sr-only"> (your pick)</span>
  ```

  `RecommendedRow`: `const { interests } = useInterests()`, `const picked = new Set(interests.categoryIds)`, `const ranked = preferredFirst(rankNearby(recommendations.data, position), picked, (e) => e.shop.categoryIds)`. `HomePage`: `<InterestsCard />` directly after `<HomeHero />`; featured items `preferredFirst(featured.data, picked, (s) => s.categoryIds)`; "See all" `to={exploreHrefFor(interests.categoryIds, categories.data ?? [])}` and `moreTo` the same; `highlighted={picked}`.

- [ ] **Step 1: Write the failing tests** in `src/routes/HomePage.test.tsx` under `describe('What are you here for?')`. The mock featured order with no picks is alphabetical after the featured/verified sort, so "The Good Cut Barbershop" is not first until Barber is picked. Guest unless stated.

```ts
it('asks a first-time visitor and puts their pick first', async () => {
  const { user } = renderRoute('/')
  expect(await screen.findByRole('heading', { name: 'What are you here for?' })).toBeInTheDocument()
  const featured = await screen.findByRole('list', { name: 'Featured shops' })
  expect(within(featured).getAllByRole('listitem')[0]).not.toHaveTextContent('The Good Cut Barbershop')
  await user.click(screen.getByRole('button', { name: 'Barber', pressed: false }))
  expect(screen.getByRole('button', { name: 'Barber', pressed: true })).toBeInTheDocument()
  expect(await screen.findByRole('status')).toHaveTextContent('Barber first. Change this any time from this page.')
  await waitFor(() => expect(within(featured).getAllByRole('listitem')[0]).toHaveTextContent('The Good Cut Barbershop'))
  expect(screen.getByRole('link', { name: /^Barber/ })).toHaveAccessibleName('Barber (your pick)')
  expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore?category=barber')
  expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/explore?category=barber')
})
it('two picks read as a pair and link Explore to everything', async () => {
  // pick Salon and Nails → status 'Salon and Nails first. …'; See all href '/explore'
})
it('Not now hides the card and changes nothing', async () => {
  // click 'Not now' → no heading, no 'Change' button, first featured listitem still not The Good Cut; re-render '/' → still no heading
})
it('a return visit shows the line, and Change reopens the chips', async () => {
  useLocalInterests.getState().set(['cat_barber'])
  const { user } = renderRoute('/')
  expect(await screen.findByText(/Barber first/)).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Change' }))
  expect(screen.getByRole('button', { name: 'Barber', pressed: true })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
})
it('a signed-in customer saves to the account', async () => {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
  const { user } = renderRoute('/')
  await user.click(await screen.findByRole('button', { name: 'Nails', pressed: false }))
  expect(await screen.findByRole('status')).toHaveTextContent('Nails first. Change this any time from your profile.')
  await waitFor(async () => expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_nails']))
})
it('shows nothing when the account answer cannot load', async () => {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
  vi.spyOn(profileService, 'getMyInterests').mockRejectedValue(new ApiError('Server down', 500))
  renderRoute('/')
  expect(await screen.findByRole('list', { name: 'Featured shops' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
})
it('recommended near you also leads with the pick', async () => {
  useLocalInterests.getState().set(['cat_barber'])
  const { user } = renderRoute('/')
  await chooseBajada(user)
  const row = await screen.findByRole('list', { name: 'Recommended near you' })
  expect(within(row).getAllByRole('listitem')[0]).toHaveTextContent('Barbershop')
})
```

If `HorizontalScroller` items are not `listitem`s, assert on the first `link` inside the list instead, and say so in the report.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/routes/HomePage.test.tsx`
Expected: the new tests FAIL (no heading); the existing home tests still pass.

- [ ] **Step 3: Implement** the two components and the three modifications as in Interfaces.

- [ ] **Step 4: Run the checks**

Run: `npx vitest run src/routes/HomePage.test.tsx src/routes/FavoritesPage.test.tsx src/features/recommendations src/features/discovery && npx prettier --write src/features/interests src/features/discovery/components/CategoryGrid.tsx src/features/recommendations/components/RecommendedRow.tsx src/routes/HomePage.tsx src/routes/HomePage.test.tsx && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Ask what a customer is here for on home and put those shops first"
```

---

### Task 5: Profile panel, docs and the e2e step

**Files:**

- Create: `src/features/interests/components/InterestsPanel.tsx`
- Modify: `src/routes/ProfilePage.tsx` (third `Panel`)
- Test: `src/routes/ProfilePage.test.tsx` (create; render with `MOCK_SESSION_KEY` set as `FavoritesPage.test.tsx` does)
- Modify: `docs/implementation-plan.md` (§7.1 `CustomerInterests`; §7.3 Account row adds `GET/PUT /me/interests`)
- Modify: `e2e/app.spec.ts`

**Interfaces:**

- Consumes: `useInterests`, `InterestChips`, `interestsSummary`, `liveInterestCategories`, `useCategoriesQuery`, `Panel`.
- Produces: `export function InterestsPanel()` rendering `<Panel title="What you're here for" description="We show these shops first on home.">` with the chips always open and `<p role="status">{interestsSummary(names)}</p>`; while interests or categories load, a `Skeleton`.

- [ ] **Step 1: Write the failing tests** in `src/routes/ProfilePage.test.tsx`:

```ts
it('shows the saved picks and saves a change', async () => {
  await profileService.updateMyInterests(['cat_salon'])
  const { user } = renderRoute('/account')
  expect(await screen.findByRole('heading', { name: 'What you're here for' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Salon', pressed: true })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Nails', pressed: false }))
  expect(await screen.findByRole('status')).toHaveTextContent('Salon and Nails first')
  await waitFor(async () => expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_salon', 'cat_nails']))
})
it('clearing every pick reads as everything', async () => {
  await profileService.updateMyInterests(['cat_salon'])
  const { user } = renderRoute('/account')
  await user.click(await screen.findByRole('button', { name: 'Salon', pressed: true }))
  expect(await screen.findByRole('status')).toHaveTextContent('Showing everything')
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/routes/ProfilePage.test.tsx`
Expected: FAIL (no such heading).

- [ ] **Step 3: Implement** the panel and add it to `ProfilePage` under "Your details". Update the two docs rows.

- [ ] **Step 4: Add the e2e step** in `e2e/app.spec.ts` to the discovery journey that starts at `page.goto('/')` (line 62 today, which clicks the Barber link): before that click, `await page.getByRole('button', { name: 'Barber', exact: true }).click()`, `await expect(page.getByRole('status')).toContainText('Barber first')`, `await expect(page.getByRole('list', { name: 'Featured shops' }).getByRole('listitem').first()).toContainText('The Good Cut Barbershop')`, `await page.reload()`, `await expect(page.getByText(/Barber first/)).toBeVisible()`, `await expect(page.getByRole('heading', { name: 'What are you here for?' })).toHaveCount(0)`. The existing `getByRole('link', { name: 'Barber', exact: true })` click after it must become `getByRole('link', { name: 'Barber (your pick)', exact: true })`, because the highlighted tile's accessible name now carries the suffix; the chip is a button, so there is still exactly one match.

- [ ] **Step 5: Run the checks and the whole e2e suite in the foreground**

Run: `npx vitest run src/routes/ProfilePage.test.tsx && npx prettier --write src/features/interests src/routes/ProfilePage.tsx src/routes/ProfilePage.test.tsx e2e/app.spec.ts && npm run check && npm run e2e`
Expected: PASS; e2e all green (it was 132 before this feature; expect the same count, one test longer). Do not run e2e in the background; the harness has killed background runs for memory.

- [ ] **Step 6: Commit**

```bash
git add src docs e2e
git commit -m "Let a customer change what they are here for from their profile"
```
