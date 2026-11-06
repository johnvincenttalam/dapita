# Customer Interests at Sign-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move "What are you here for?" from the home-page card into the customer create-account form, saved with the account in the same request, and make interests account-only.

**Architecture:** This revises the feature built by `docs/superpowers/plans/2026-11-05-customer-interests.md` on the same branch. The sign-up request grows an optional `interests` array that both the server controller and the mock sign-up normalise with the shared `normaliseInterestIds` and store on the new user. The customer sign-up form renders the existing `InterestChips` inside a fieldset. `useInterests()` drops its guest branch, handoff and sign-out clearing; the browser store and the home card are deleted. Rows, tiles, links and the profile panel keep reading the hook unchanged.

**Tech Stack:** React 19, react-hook-form + Zod, TanStack Query, Vitest + Testing Library; AdonisJS 6 + VineJS + Lucid with Japa; Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-05-customer-interests-design.md` (revised sections: "The question in the create-account form", "Sign-up", "Removed").

## Global Constraints

- Copy verbatim from the spec: legend "What are you here for?", description "Optional. Pick what you book most and we’ll show those shops first." (typographic apostrophe), refusal "Choose from the categories on the list.", schema message "Choose fewer categories".
- Chips are `<button type="button" aria-pressed>` elements (the existing `InterestChips`); a tap never submits the form. Business sign-up gets no field.
- Only live top-level categories are accepted (no `parentId`, `status === 'active'`); stored ids are deduped and in catalog `sortOrder`. Use the shared helpers in `src/lib/interests.ts`; never duplicate the logic on the server.
- Sign-up never waits on the catalog: while categories load the field is a skeleton; if they fail it renders nothing.
- `interests` on a sign-up is customer-only and optional; absent or empty leaves the account unanswered (`null` on the server, no `interests` key in the mock state).
- Frontend checks: `npm run check` (typecheck, lint, Prettier, Vitest). Server checks from `server/`: `npm run typecheck && npm run lint && npm test`. Run `npx prettier --write` on touched frontend files first (ESLint doesn't run Prettier).
- Commit messages: one plain imperative sentence, with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Work on the existing branch `customer-interests` (PR #24 is open; do not open another). Two user-owned `npm run dev:all` stacks are running; never kill node processes.

## Review Focus

1. The catalog request fails while a customer fills the form: Create account still works and the account is created without an answer (Task 2 test "signs up without the field when categories cannot load").
2. A chip tap inside the form must not submit it or trip the terms validation (Task 2 test "a chip tap does not submit").
3. A sign-up carrying a retired or subcategory id creates no user and reports the shared message (Task 1 test "refuses a pick that is not a live category and creates nothing").
4. A second person signs in on the same browser: the first person's queued saves never land on the second account (kept from the first build; Task 3 keeps the hook test "drops saves that were waiting when the customer signs out").
5. A guest renders home with the hook in place: no request to `/me/interests`, no highlight, catalog order (Task 3 test "a guest sees today's home").

---

### Task 1: Server sign-up accepts `interests`

**Files:**

- Modify: `server/app/validators/auth.ts` (`signUpValidator`)
- Modify: `server/app/controllers/auth_controller.ts` (`signUp`)
- Modify: `server/app/services/profile.ts` (export `allCategories`)
- Test: `server/tests/functional/auth.spec.ts`

**Interfaces:**

- Consumes: `normaliseInterestIds(ids, categories): ID[] | null` and `interestsMessages.notOnList` from `#shared/domain`; `toCategoryData` from `#services/catalog`; `ApiError(message, status, code?)` from `#exceptions/api_error`.
- Produces: `POST /api/auth/sign-up` body field `interests?: string[]` (max 12). On success with a customer account the user row has `interests = { categoryIds, answeredAt }`; `GET /api/me/interests` returns it.

- [ ] **Step 1: Write the failing tests** in `server/tests/functional/auth.spec.ts`, inside the existing `Auth` group (imports: `User` from `#models/user` if not present):

```ts
const customerSignUp = (overrides: Record<string, unknown> = {}) => ({
  accountType: 'customer',
  name: 'Mia Reyes',
  email: 'mia@example.com',
  password: 'barber2026',
  consents: [{ purpose: 'terms', version: 'draft-2026-10' }],
  ...overrides,
})

test('signs up a customer with what they are here for', async ({ client, assert }) => {
  const response = await client
    .post('/api/auth/sign-up')
    .json(customerSignUp({ interests: ['cat_salon', 'cat_barber', 'cat_salon'] }))
  response.assertStatus(200)
  const user = await User.findByOrFail('email', 'mia@example.com')
  const interests = await client.get('/api/me/interests').loginAs(user)
  interests.assertStatus(200)
  assert.deepEqual(interests.body().categoryIds, ['cat_barber', 'cat_salon'])
  assert.isString(interests.body().answeredAt)
})

test('a customer who picks nothing starts unanswered', async ({ client, assert }) => {
  const response = await client.post('/api/auth/sign-up').json(customerSignUp())
  response.assertStatus(200)
  const user = await User.findByOrFail('email', 'mia@example.com')
  const interests = await client.get('/api/me/interests').loginAs(user)
  assert.deepEqual(interests.body(), { categoryIds: [] })
})

test('refuses a pick that is not a live category and creates nothing', async ({ client, assert }) => {
  const response = await client.post('/api/auth/sign-up').json(customerSignUp({ interests: ['sub_styling'] }))
  response.assertStatus(422)
  response.assertBodyContains({ message: 'Choose from the categories on the list.' })
  assert.isNull(await User.findBy('email', 'mia@example.com'))
})
```

(`cat_barber` sorts before `cat_salon` in the seed; `sub_styling` is a subcategory. Check `server/database/seeders` if either id differs and use the seeded ids.)

- [ ] **Step 2: Run them to verify they fail**

Run (from `server/`): `npm test -- --files tests/functional/auth.spec.ts`
Expected: the first test fails on `categoryIds` (`[]` instead of two ids), the third on status (200 instead of 422).

- [ ] **Step 3: Accept the field.** In `signUpValidator` add `interests: vine.array(vine.string()).maxLength(12).optional()`. In `server/app/services/profile.ts` export the existing `allCategories()` (it is module-private today). In `AuthController.signUp`, after the email check and before the transaction:

```ts
let interests: CustomerInterests | null = null
if (input.accountType === 'customer' && input.interests?.length) {
  const categoryIds = normaliseInterestIds(input.interests, await allCategories())
  if (!categoryIds) throw new ApiError(interestsMessages.notOnList, 422)
  interests = { categoryIds, answeredAt: new Date().toISOString() }
}
```

and pass `interests` into `User.create`. `CustomerInterests`, `normaliseInterestIds` and `interestsMessages` come from `#shared/domain`.

- [ ] **Step 4: Run the server checks**

Run (from `server/`): `npm run typecheck && npm run lint && npm test`
Expected: all pass (105 tests: 102 + 3).

- [ ] **Step 5: Commit**

```bash
git add server/app/validators/auth.ts server/app/controllers/auth_controller.ts server/app/services/profile.ts server/tests/functional/auth.spec.ts
git commit -m "Let a customer say what they are here for when the account is created"
```

---

### Task 2: The create-account form asks

**Files:**

- Modify: `src/schemas/auth.ts` (`customerSignUpSchema.interests`)
- Test: `src/schemas/auth.test.ts`
- Modify: `src/services/auth.service.ts` (`SignUpRequest.interests?`; mock `signUp` stores it)
- Create: `src/features/interests/components/InterestsField.tsx`
- Modify: `src/features/auth/components/SignUpForms.tsx` (`CustomerSignUpForm` only)
- Test: `src/app/onboarding.test.tsx`

**Interfaces:**

- Consumes: `InterestChips({ categories, selected, onToggle })` from `src/features/interests/components/InterestChips.tsx`; `liveInterestCategories`, `toggleInterest`, `normaliseInterestIds`, `interestsMessages` from `@/lib/interests`; `useCategoriesQuery()` from `@/features/discovery/api/queries`; `FieldSet`, `FieldLegend`, `FieldDescription` from `@/components/ui/field`; `Skeleton` from `@/components/ui/skeleton`; `readMockDb` from `@/services/mock/db`.
- Produces: `InterestsField({ value: ID[]; onChange: (ids: ID[]) => void; disabled?: boolean })`; `SignUpRequest.interests?: ID[]`.

- [ ] **Step 1: Write the failing schema test** in `src/schemas/auth.test.ts`, inside `describe('sign-up schemas')`:

```ts
it('interests are optional and capped', () => {
  expect(customerSignUpSchema.parse(customer).interests).toEqual([])
  const tooMany = customerSignUpSchema.safeParse({
    ...customer,
    interests: Array.from({ length: 13 }, (_, i) => `cat_${i}`),
  })
  expect(tooMany.error?.issues[0]?.message).toBe('Choose fewer categories')
})
```

- [ ] **Step 2: Write the failing form tests** in `src/app/onboarding.test.tsx`, inside the customer sign-up `describe` (import `profileService` from `@/services/profile.service`, `catalogService` from `@/services/catalog.service`, `ApiError` from `@/lib/api-client`; mirror the existing fill-in steps):

```ts
it('saves what a new customer is here for with the account', async () => {
  const { user } = renderRoute('/auth/sign-up')
  const field = await screen.findByRole('group', { name: 'What are you here for?' })
  expect(field).toHaveTextContent('Optional. Pick what you book most and we’ll show those shops first.')
  await user.type(screen.getByRole('textbox', { name: /your name/i }), 'Mia Reyes')
  await user.type(screen.getByRole('textbox', { name: /email/i }), 'mia@example.com')
  await user.type(screen.getByLabelText(/^password/i), 'mirror42')
  await user.click(within(field).getByRole('button', { name: 'Salon', pressed: false }))
  await user.click(within(field).getByRole('button', { name: 'Barber', pressed: false }))
  // A chip tap does not submit: no validation message yet.
  expect(screen.queryByText('Accept the terms to create an account')).not.toBeInTheDocument()
  await user.click(screen.getByRole('checkbox', { name: /i agree to the terms of use/i }))
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
  expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_barber', 'cat_salon'])
})

it('signs up without the field when categories cannot load', async () => {
  vi.spyOn(catalogService, 'getCategories').mockRejectedValue(new ApiError('Server down', 500))
  const { user } = renderRoute('/auth/sign-up')
  await user.type(await screen.findByRole('textbox', { name: /your name/i }), 'Mia Reyes')
  await waitFor(() => expect(screen.queryByRole('group', { name: 'What are you here for?' })).not.toBeInTheDocument())
  await user.type(screen.getByRole('textbox', { name: /email/i }), 'mia@example.com')
  await user.type(screen.getByLabelText(/^password/i), 'mirror42')
  await user.click(screen.getByRole('checkbox', { name: /i agree to the terms of use/i }))
  await user.click(screen.getByRole('button', { name: 'Create account' }))
  expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
  expect(await profileService.getMyInterests()).toEqual({ categoryIds: [] })
})
```

and, in the business sign-up `describe`, one line inside the existing "verifies the email" test after the form renders: `expect(screen.queryByRole('group', { name: 'What are you here for?' })).not.toBeInTheDocument()`.

(If `catalogService.getCategories` is not the method name, use the one `useCategoriesQuery` calls. The query client in tests retries 0 times; if the field's skeleton lingers because the query is still pending, wait for it with `waitFor` as above.)

- [ ] **Step 3: Run both files to verify they fail**

Run: `npx vitest run src/schemas/auth.test.ts src/app/onboarding.test.tsx`
Expected: FAIL. The schema test on `interests` undefined; the form tests on the missing group.

- [ ] **Step 4: Schema and request.** In `src/schemas/auth.ts` add `interests: z.array(z.string()).max(12, 'Choose fewer categories').default([])` to `customerSignUpSchema` only. In `src/services/auth.service.ts` add `/** Customers only: live top-level category ids they are here for. */ interests?: ID[]` to `SignUpRequest`. In the mock `signUp`, before `updateMockAccounts`:

```ts
let interests: CustomerInterests | undefined
if (input.accountType === 'customer' && input.interests?.length) {
  const categoryIds = normaliseInterestIds(input.interests, readMockDb().categories)
  if (!categoryIds) throw new ApiError(interestsMessages.notOnList, 422)
  interests = { categoryIds, answeredAt: now }
}
```

and set `interests` on the new `store.state[id]` (leave the key absent when undefined).

- [ ] **Step 5: `InterestsField`** in `src/features/interests/components/InterestsField.tsx`:

```tsx
export function InterestsField({
  value,
  onChange,
  disabled,
}: {
  value: ID[]
  onChange: (ids: ID[]) => void
  disabled?: boolean
})
```

Reads `useCategoriesQuery()`. Error: returns `null`. Pending: `<Skeleton aria-hidden="true" className="h-11 w-full rounded-full" />`. Otherwise a `FieldSet` with `FieldLegend` "What are you here for?", `FieldDescription` "Optional. Pick what you book most and we’ll show those shops first.", and `InterestChips` with `selected = new Set(value)` and `onToggle = (id) => onChange(toggleInterest(value, id, live))`. The fieldset is the accessible group; keep the legend as its first child.

- [ ] **Step 6: The form.** In `CustomerSignUpForm`: add `interests: []` to `defaultValues`; render the field after the password `FormField` and before the terms one with `useController`/`Controller` on `name="interests"` (or `form.watch('interests')` + `form.setValue`) passing `value`, `onChange` and `disabled={form.formState.isSubmitting}`; in `onSubmit` add `interests: interests.length > 0 ? interests : undefined` to the request.

- [ ] **Step 7: Run the tests, then the full check**

Run: `npx prettier --write src/schemas/auth.ts src/services/auth.service.ts src/features/interests/components/InterestsField.tsx src/features/auth/components/SignUpForms.tsx src/app/onboarding.test.tsx src/schemas/auth.test.ts && npm run check`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/schemas/auth.ts src/schemas/auth.test.ts src/services/auth.service.ts src/features/interests/components/InterestsField.tsx src/features/auth/components/SignUpForms.tsx src/app/onboarding.test.tsx
git commit -m "Ask what a customer is here for while they create their account"
```

---

### Task 3: Interests live on the account only; home loses the card

**Files:**

- Modify: `src/features/interests/use-interests.ts` (account only)
- Delete: `src/features/interests/interests-store.ts`
- Delete: `src/features/interests/components/InterestsCard.tsx`
- Modify: `src/routes/HomePage.tsx` (drop the card)
- Test: `src/features/interests/use-interests.test.tsx`
- Test: `src/routes/HomePage.test.tsx`
- Modify: `src/routes/ProfilePage.test.tsx` (imports only, if any break)
- Modify: `e2e/app.spec.ts` (discovery and onboarding journeys)

**Interfaces:**

- Consumes: `useMyInterestsQuery(enabled)`, `useUpdateInterestsMutation()`, `accountKeys.interests()` from `@/features/account/api/queries`; `useSession`, `sessionKeys` from `@/features/auth/api/queries`.
- Produces: `useInterests(): { interests: CustomerInterests; answered: boolean; isPending: boolean; isError: boolean; setCategoryIds: (ids: ID[]) => void }` and `resetInterestsSync()`. `InterestsPanel` keeps working unchanged (it never used `dismiss`).

- [ ] **Step 1: Rewrite the hook tests** in `src/features/interests/use-interests.test.tsx`. Remove the imports of `INTERESTS_STORAGE_KEY`/`useLocalInterests` and these tests: "a guest starts unanswered and saves to the browser", "junk in storage counts as unanswered", the five handoff/copy tests, "sign-out clears a guest answer that never reached the account", "keeps the account answer when both are answered". Keep the rest. Add:

```ts
it('a signed-out viewer reads unanswered and cannot save', async () => {
  const update = vi.spyOn(profileService, 'updateMyInterests')
  const { result } = renderInterests()
  await waitFor(() => expect(result.current.isPending).toBe(false))
  expect(result.current.interests).toEqual({ categoryIds: [] })
  expect(result.current.answered).toBe(false)
  act(() => result.current.setCategoryIds(['cat_barber']))
  expect(update).not.toHaveBeenCalled()
})
```

(`renderInterests` is whatever helper the file already uses to render the hook with a query client; keep "sign-out leaves a fresh guest" if it only checks that the account answer is gone after `MOCK_SESSION_KEY` is removed, otherwise drop it.)

- [ ] **Step 2: Rewrite the home tests** in `src/routes/HomePage.test.tsx`. Remove the `useLocalInterests` import and its `clear()` in `beforeEach`. Replace the `describe('What are you here for?')` block with `describe('Shops a customer is here for')`:

```ts
const signInAnswered = async (categoryIds: string[]) => {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
  await profileService.updateMyInterests(categoryIds)
}

it('puts a signed-in customer’s pick first and highlights the tile', async () => {
  await signInAnswered(['cat_barber'])
  renderRoute('/')
  const featured = await screen.findByRole('list', { name: 'Featured shops' })
  await waitFor(() => expect(within(featured).getAllByRole('listitem')[0]).toHaveTextContent('The Good Cut Barbershop'))
  const grid = screen.getByRole('region', { name: 'Browse by category' })
  expect(within(grid).getByRole('link', { name: /^Barber/ })).toHaveAccessibleName('Barber (your pick)')
  expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore?category=barber')
  expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/explore?category=barber')
  expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
})

it('two picks link Explore to everything', async () => {
  await signInAnswered(['cat_salon', 'cat_nails'])
  renderRoute('/')
  const grid = await screen.findByRole('region', { name: 'Browse by category' })
  expect(within(grid).getByRole('link', { name: /^Salon/ })).toHaveAccessibleName('Salon (your pick)')
  expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore')
  expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/explore')
})

it('a guest sees today’s home', async () => {
  const read = vi.spyOn(profileService, 'getMyInterests')
  renderRoute('/')
  const featured = await screen.findByRole('list', { name: 'Featured shops' })
  expect(within(featured).getAllByRole('listitem')[0]).not.toHaveTextContent('The Good Cut Barbershop')
  expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore')
  expect(read).not.toHaveBeenCalled()
})

it('shows today’s home when the account answer cannot load', async () => {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
  vi.spyOn(profileService, 'getMyInterests').mockRejectedValue(new ApiError('Server down', 500))
  renderRoute('/')
  const featured = await screen.findByRole('list', { name: 'Featured shops' })
  expect(within(featured).getAllByRole('listitem')[0]).not.toHaveTextContent('The Good Cut Barbershop')
  expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore')
})

it('recommended near you also leads with the pick', async () => {
  await signInAnswered(['cat_barber'])
  const { user } = renderRoute('/')
  await chooseBajada(user)
  const row = await screen.findByRole('list', { name: 'Recommended near you' })
  const items = within(row).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Barbershop')
  expect(items[1]).toHaveTextContent('Fade Factory Barbers')
})
```

Drop the `toast` import if nothing else uses it.

- [ ] **Step 3: Run both files to verify they fail**

Run: `npx vitest run src/features/interests/use-interests.test.tsx src/routes/HomePage.test.tsx`
Expected: the new guest test fails (the card heading is present) and the hook file fails to compile only if a kept test still references the store; otherwise the guest test is the failing one.

- [ ] **Step 4: Slim the hook.** In `src/features/interests/use-interests.ts`: remove the `useLocalInterests`, `dropRetiredInterests`, `ApiError`, `useCategoriesQuery` imports, the `handedOff` field, the two `useEffect`s (keep a one-line effect `useEffect(() => { syncFor(userId) }, [userId])` so a user switch still drops the old queue), the guest branch in `save` (signed out: return `'superseded'` without writing), `dismiss`, `keepsGuestAnswer`/`guestAnswer`. `interests` is `userId ? (account.data ?? UNANSWERED) : UNANSWERED`. Update `InterestsState` and the doc comment ("Signed-in customers keep it on their account; a guest has none."). Keep `writeToAccount`, `syncFor`, `resetInterestsSync` and `SaveOutcome` (still returned by `save` internally; export only what is used).

- [ ] **Step 5: Delete the store and the card; update home.** `git rm src/features/interests/interests-store.ts src/features/interests/components/InterestsCard.tsx`. In `src/routes/HomePage.tsx` remove the `InterestsCard` import and the `<InterestsCard />` line; keep `useInterests`, `picked` and `exploreHref`. Fix any remaining import of the store (`grep -rn "interests-store\|useLocalInterests\|INTERESTS_STORAGE_KEY" src e2e`).

- [ ] **Step 6: e2e.** In `e2e/app.spec.ts` discovery journey, replace the block from `await page.getByRole('button', { name: 'Barber', exact: true }).click()` through the `toHaveCount(0)` line and the `'Barber (your pick)'` click with the pre-feature line `await page.getByRole('link', { name: 'Barber', exact: true }).click()`. In the onboarding journey, after the password fill add `await page.getByRole('button', { name: 'Barber', exact: true }).click()`; after the final booking assertion add:

```ts
await page.goto('/')
await expect(page.getByRole('link', { name: 'Barber (your pick)', exact: true })).toBeVisible()
```

- [ ] **Step 7: Run the checks**

Run: `npx prettier --write src/features/interests/use-interests.ts src/features/interests/use-interests.test.tsx src/routes/HomePage.tsx src/routes/HomePage.test.tsx e2e/app.spec.ts && npm run check`
Expected: green. Then `npm run test:e2e` (foreground; it builds and serves on 4173): all pass.

- [ ] **Step 8: Commit**

```bash
git add -A src/features/interests src/routes/HomePage.tsx src/routes/HomePage.test.tsx src/routes/ProfilePage.test.tsx e2e/app.spec.ts
git commit -m "Keep a customer's interests on the account only and take the question off home"
```

---

### Task 4: Docs

**Files:**

- Modify: `docs/implementation-plan.md` (§7.3 Session/auth row: note `POST /auth/sign-up` takes `interests?`; §7.1 `CustomerInterests` comment: "asked at sign-up, changed from the profile")
- Modify: `docs/superpowers/plans/2026-11-05-customer-interests.md` (one line under the header: "Superseded in part by `2026-11-05-customer-interests-at-sign-up.md`: the home card and guest store were removed the same day.")

- [ ] **Step 1: Make the two edits**, keeping table alignment (run `npx prettier --write docs/implementation-plan.md docs/superpowers/plans/2026-11-05-customer-interests.md docs/superpowers/plans/2026-11-05-customer-interests-at-sign-up.md docs/superpowers/specs/2026-11-05-customer-interests-design.md`).

- [ ] **Step 2: Verify** `npm run check` still passes (Prettier covers docs).

- [ ] **Step 3: Commit**

```bash
git add docs
git commit -m "Record that a customer's interests are asked at sign-up"
```
