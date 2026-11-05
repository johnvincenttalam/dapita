# Service Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A merchant opens a service they already have, adds one photo on its edit page, and it's live on the shop page, the service page and the booking form, with replace and remove.

**Architecture:** `Service.photoUrl` becomes `Service.photo?: ServicePhoto { url, srcSet? }`. The server keeps a nullable JSON `photo` column holding either a seeded `{ url }` or an uploaded `{ storageKey }`, and builds public URLs at serialization exactly as business photos do. Two merchant endpoints (`PUT`/`DELETE …/services/:serviceId/photo`) reuse the shop photos pipeline (`toWebpCopies`, `putFile`, `deleteUploaded`) under the existing `withMenu` row lock. The frontend adds two service methods (HTTP + mock), two mutation hooks, and a `ServicePhotoField` on the edit page that uploads on pick.

**Tech Stack:** React 19 + Vite + TanStack Query + Vitest/Testing Library (frontend); AdonisJS 6 + Lucid + PostgreSQL + sharp + Japa (server). Shared types and limits via `#shared/domain` (`server/app/shared/domain.ts` re-exports `src/types` and `src/config/photos.ts`).

**Spec:** `docs/superpowers/specs/2026-11-03-service-photos-design.md`

## Global Constraints

- Limits and copy come from `src/config/photos.ts`: `photoRules.maxBytes` (10 MB), `photoRules.acceptedTypes` (JPEG, PNG, WebP), `photoRules.widths` (320, 640, 1280), `photoMessages.noFile`, `notAPhoto`, `tooLarge`, `notFound`. Never retype the numbers or the strings.
- No server-side cropping. Copies are resized by width only, via the existing `toWebpCopies`.
- `storageKey` is never sent to clients. Public URLs are built at serialization from `UPLOADS_PUBLIC_URL` (default `/api/uploads`).
- The three customer spots keep `alt=""`. There is no `alt` in `ServicePhoto`.
- No photo spot on the Add service page or in the wizard's `simple` form. The photo is optional everywhere; no checklist or moderation change.
- Uploading never marks the form dirty, never waits for Save, and is never disabled by the form's `isSubmitting` fieldset. Photo buttons are `type="button"`.
- Formatting and lint are gates: `npm run check` at the root (typecheck, ESLint, Prettier, Vitest) and `npm --prefix server run lint`, `npm --prefix server run typecheck`, `npm --prefix server test` (needs local PostgreSQL `dapita_test`). Frontend ESLint doesn't run Prettier, so run `npx prettier --write` on touched files before committing.
- Commit messages are one plain imperative sentence (see `git log`), ending with the session's `Co-Authored-By` trailer.
- The mock database reseeds only when `MOCK_DB_VERSION` changes (`src/services/mock/db.ts`). Any seed shape change bumps it.

## Review Focus

Inputs the spec implies but doesn't spell out, each pinned by a test in the owning task:

1. A member uploads to a service id that belongs to another business → 404 "We couldn't find that service." and no files written. (Task 2)
2. Replacing or removing a seeded `{ url }` photo must not try to delete files that aren't in storage, and must still succeed. (Task 2)
3. The public shop services JSON and the merchant menu JSON never contain `storageKey`. (Task 2)
4. Renaming or otherwise editing a service keeps its photo, on the server (`updateService` merges only form fields) and in the mock (`Object.assign(service, fromInput(valid))`). (Tasks 2 and 3)
5. Deleting a booked service is refused with 409 and its files stay; deleting an unbooked one removes its files. (Task 2)

---

### Task 1: The `photo` shape, end to end, with seeded photos only

Replaces `photoUrl` with `photo` in the shared type, the server column, the seed and the three customer spots. No uploads yet; seeded `{ url }` photos pass through.

**Files:**

- Modify: `src/types/business.ts:106` (the `Service` interface)
- Modify: `src/services/mock/seed/businesses.ts:500-502`
- Modify: `src/services/mock/db.ts:22` (`MOCK_DB_VERSION`)
- Modify: `src/services/merchant-services.service.ts:104` (`fromInput`'s `Omit`)
- Modify: `src/features/shops/components/ServiceRow.tsx:20`, `src/routes/ServicePage.tsx:92-97`, `src/features/booking/components/BookingRequestForm.tsx:136-141`
- Create: `server/database/migrations/1761900000011_replace_service_photo_url_with_photo.ts`
- Modify: `server/app/models/service.ts:35-36`
- Modify: `server/app/helpers/photos.ts`
- Modify: `server/app/services/shops.ts:48`, `server/app/services/merchant_services.ts:134`, `server/database/seeders/main_seeder.ts:149`
- Test: `src/features/shops/components/ServiceRow.test.tsx` (create), `server/tests/functional/merchant_services.spec.ts`

**Interfaces:**

- Produces (shared, `src/types/business.ts`):
  ```ts
  export interface ServicePhoto {
    url: string
    /** Smaller copies for rows and the booking header, as an `srcset`. Absent for seeded photos. */
    srcSet?: string
  }
  // on Service, replacing photoUrl:
  photo?: ServicePhoto
  ```
- Produces (server, `server/app/helpers/photos.ts`):
  ```ts
  export type StoredServicePhoto = ServicePhoto | { storageKey: string }
  export function isUploadedServicePhoto(photo: StoredServicePhoto): photo is { storageKey: string }
  export function toPublicServicePhoto(photo: StoredServicePhoto): ServicePhoto
  ```
  Both `toPublicPhoto` and `toPublicServicePhoto` build URLs through one private `publicUrls(storageKey): { url: string; srcSet: string }` (the 1280 copy as `url`, all `photoRules.widths` in `srcSet`).
- Produces (server model): `Service.photo: StoredServicePhoto | null`, `@column(json)`.

- [ ] **Step 1: Write the failing frontend test**

Create `src/features/shops/components/ServiceRow.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ServiceRow } from '@/features/shops/components/ServiceRow'
import type { Service } from '@/types/business'

const service: Service = {
  id: 'svc_1',
  businessId: 'biz_1',
  categoryId: 'sub_haircut',
  name: 'Hot Towel Shave',
  price: { type: 'fixed', amount: 200 },
  durationMinutes: 30,
  bufferMinutes: 0,
  featured: false,
  active: true,
  sortOrder: 1,
  photo: { url: '/api/uploads/services/svc_1/ph_1-1280.webp', srcSet: '/a-320.webp 320w, /a-640.webp 640w' },
}

describe('ServiceRow', () => {
  it('shows the photo with its smaller copies and keeps it decorative', () => {
    render(
      <MemoryRouter>
        <ServiceRow service={service} shopSlug="the-good-cut-barbershop" />
      </MemoryRouter>,
    )
    const image = screen.getByRole('presentation')
    expect(image).toHaveAttribute('src', service.photo!.url)
    expect(image).toHaveAttribute('srcset', service.photo!.srcSet)
    expect(image).toHaveAttribute('sizes', '64px')
  })
})
```

(An `<img alt="">` has the `presentation` role.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/shops/components/ServiceRow.test.tsx`
Expected: FAIL, typecheck or assertion on `src` (the row still reads `photoUrl`).

- [ ] **Step 3: Change the shared type and the frontend readers**

- `src/types/business.ts`: add `ServicePhoto` as in Interfaces; on `Service` replace `photoUrl?: string` with `photo?: ServicePhoto`.
- `ServiceRow.tsx`: `src={service.photo?.url} srcSet={service.photo?.srcSet} sizes="64px" alt=""`.
- `BookingRequestForm.tsx`: same props, `sizes="64px"`.
- `ServicePage.tsx`: same props, `sizes="(min-width: 640px) 128px, 100vw"`.
- `src/services/merchant-services.service.ts:104`: `Omit<Service, 'id' | 'businessId' | 'sortOrder' | 'photo'>`.
- `src/services/mock/seed/businesses.ts:501`: `photo: { url: \`${import.meta.env.BASE_URL}images/services/service-${id}.webp\` }`.
- `src/services/mock/db.ts`: `MOCK_DB_VERSION = 21`.

- [ ] **Step 4: Run the frontend checks**

Run: `npx vitest run src/features/shops/components/ServiceRow.test.tsx && npm run typecheck && npm run lint`
Expected: PASS, no type errors (every `photoUrl` reader in `src/` is gone).

- [ ] **Step 5: Write the failing server test**

In `server/tests/functional/merchant_services.spec.ts`, add to the existing group:

```ts
test('keeps a seeded photo through an edit and sends it as `photo`', async ({ client, assert }) => {
  const owner = await userByEmail(ownerEmail)
  const menu = await client.get(servicesPath).loginAs(owner)
  const haircut = menu.body().services.find((item: { id: string }) => item.id === 'svc_mens_haircut')
  assert.deepEqual(haircut.photo, { url: '/images/services/service-svc_mens_haircut.webp' })
  assert.notProperty(haircut, 'photoUrl')

  const edited = await client
    .put(`${servicesPath}/svc_mens_haircut`)
    .json({ ...service, name: 'Classic Cut', categoryId: haircut.categoryId })
    .loginAs(owner)
  edited.assertStatus(200)
  assert.deepEqual(edited.body().photo, haircut.photo)

  const shop = await client.get('/api/shops/the-good-cut-barbershop/services')
  const listed = shop.body().find((item: { id: string }) => item.id === 'svc_mens_haircut')
  assert.deepEqual(listed.photo, haircut.photo)
})
```

Check the public services route path in `server/start/routes.ts` (`shops.services`) and adjust the GET if it differs.

- [ ] **Step 6: Run it to verify it fails**

Run: `cd server && npm test -- --files tests/functional/merchant_services.spec.ts`
Expected: FAIL (`photo` is undefined; the column is still `photo_url`).

- [ ] **Step 7: Migrate the column and update the model, helper, serializer, seeder**

- Migration `1761900000011_replace_service_photo_url_with_photo.ts`: `up` alters `services` to `dropColumn('photo_url')` and add `table.json('photo').nullable()`; `down` reverses (drop `photo`, add `string('photo_url').nullable()`). No data copy: only the seeder writes this column.
- `server/app/models/service.ts`: replace `photoUrl` with `@column(json) declare photo: StoredServicePhoto | null`.
- `server/app/helpers/photos.ts`: add `StoredServicePhoto`, `isUploadedServicePhoto`, `toPublicServicePhoto`, and extract the private `publicUrls(storageKey)` so `toPublicPhoto` uses it too.
- `server/app/services/shops.ts:48`: `photo: service.photo ? toPublicServicePhoto(service.photo) : undefined`.
- `server/app/services/merchant_services.ts:134`: `photo: null`.
- `server/database/seeders/main_seeder.ts:149`: `photo: service.photo ?? null`.

- [ ] **Step 8: Run the server checks**

Run: `cd server && npm run typecheck && npm run lint && npm test`
Expected: all PASS. The test bootstrap re-exports the seed and migrates the test database, so the new column and seed shape are picked up without manual steps.

- [ ] **Step 9: Reset the dev database and format**

Run: `npm run server:db:reset` (so the dev API has the new column), then `npx prettier --write` on every touched frontend file, then `npm run check`.
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src server
git commit -m "Give services a photo shape with smaller copies instead of a bare URL"
```

---

### Task 2: Server endpoints to set and remove a service photo

**Files:**

- Create: `server/app/helpers/uploads.ts` (move `withUpload` out of `merchant_photos_controller.ts`)
- Modify: `server/app/controllers/merchant_photos_controller.ts` (import `withUpload`)
- Create: `server/app/services/service_photos.ts`
- Create: `server/app/controllers/merchant_service_photos_controller.ts`
- Modify: `server/app/services/merchant_services.ts` (export `withMenu` and `serviceNotFound`; `deleteService` drops files after the transaction)
- Modify: `server/start/routes.ts:128-141` (two routes under the merchant group)
- Test: `server/tests/functional/merchant_service_photos.spec.ts` (create)

**Interfaces:**

- Consumes: `toPublicServicePhoto`, `isUploadedServicePhoto`, `StoredServicePhoto` (Task 1); `toWebpCopies`, `putFile`, `deleteUploaded`, `photoRules`, `photoMessages`, `newId`, `ApiError` as `business_photos.ts` uses them.
- Produces (`server/app/helpers/uploads.ts`):
  ```ts
  export function withUpload<T>(
    request: HttpContext['request'],
    handle: (file: MultipartFile | null) => Promise<T>,
  ): Promise<T>
  ```
  Same body as today's private helper in `merchant_photos_controller.ts`.
- Produces (`server/app/services/merchant_services.ts`): `export function withMenu<T>(…)` and `export const serviceNotFound: () => ApiError`, unchanged bodies.
- Produces (`server/app/services/service_photos.ts`):
  ```ts
  export function setServicePhoto(businessId: ID, serviceId: ID, file: MultipartFile | null): Promise<Service>
  export function removeServicePhoto(businessId: ID, serviceId: ID): Promise<Service>
  ```
  `Service` here is the shared `Service` data type (what `toServiceData` returns). Storage key: `services/<serviceId>/<newId('ph')>`; files are `<storageKey>-<width>.webp`, so `deleteUploaded([storageKey])` removes all three.
- Routes: `PUT /api/merchant/businesses/:businessId/services/:serviceId/photo` → `MerchantServicePhotosController.update`; `DELETE` same path → `destroy`. Both `requireMember` first, return the updated `Service` JSON with status 200.

- [ ] **Step 1: Write the failing tests**

Create `server/tests/functional/merchant_service_photos.spec.ts`, modelled on `merchant_photos.spec.ts` (same imports, `fixture()`, `uploadsRoot()`, `removeTestUploads` in `group.teardown`, `withGlobalTransaction` per test):

```ts
const photoPath = (serviceId: string) =>
  `/api/merchant/businesses/${goodCutId}/services/${serviceId}/photo`
const serviceFiles = (serviceId: string) =>
  readdir(join(uploadsRoot(), 'services', serviceId)).catch(() => [] as string[])
const publicService = async (client: ApiClient, serviceId: string) =>
  (await client.get('/api/shops/the-good-cut-barbershop/services')).body().find((s: { id: string }) => s.id === serviceId)

test('sets a photo, replacing the seeded one, and serves WebP copies', …)
  // PUT fixture to svc_mens_haircut as owner → 200
  // body.photo.url matches /^\/api\/uploads\/services\/svc_mens_haircut\/ph_.*-1280\.webp$/
  // body.photo.srcSet contains ' 320w', ' 640w', ' 1280w'; body has no 'storageKey' anywhere (assert.notInclude(JSON.stringify(body), 'storageKey'))
  // serviceFiles('svc_mens_haircut') has length 3
  // GET public services: photo equals body.photo; JSON.stringify has no 'storageKey'
  // GET body.photo.url → 200 with content-type image/webp

test('replacing an uploaded photo deletes the old copies', …)
  // PUT twice; after the second, serviceFiles has length 3 and none of the first upload's names remain

test('removes a photo and its files, and 404s when there is none', …)
  // PUT fixture to svc_hot_shave, DELETE → 200 with body.photo undefined; serviceFiles('svc_hot_shave') empty
  // DELETE again → 404, message photoMessages.notFound

test('a seeded photo can be removed without touching storage', …)
  // DELETE on svc_mens_haircut (seeded { url }) straight away → 200, photo undefined; no throw, serviceFiles empty

test('rejects a missing file, a renamed text file and an oversized file', …)
  // PUT with no file → 422 photoMessages.noFile
  // PUT a .txt written to tmp named photo.jpg → 422 photoMessages.notAPhoto, serviceFiles empty
  // PUT a file of photoRules.maxBytes + 1 zero bytes written to tmp → 422 photoMessages.tooLarge

test('only members of the business, and only its own services', …)
  // customer → 403 on PUT and DELETE
  // owner PUT to a service id from another seeded shop (pick one from the mock seed, e.g. 'svc_gg_cut') → 404 'We couldn’t find that service.' and serviceFiles('svc_gg_cut') empty
  // owner PUT to 'svc_nope' → 404

test('editing the service keeps its uploaded photo', …)
  // PUT fixture, then PUT /services/:id with the full form body (reuse the `service` object from merchant_services.spec.ts shape) → body.photo deep-equals the upload's photo

test('deleting an unbooked service removes its files; a booked one keeps them', …)
  // create a service via POST, PUT a photo, DELETE /services/:id → 204, serviceFiles(newId) empty
  // PUT a photo to svc_mens_haircut (booked in the seed), DELETE /services/svc_mens_haircut → 409, serviceFiles has 3
```

Write each test out in full with those assertions.

- [ ] **Step 2: Run them to verify they fail**

Run: `cd server && npm test -- --files tests/functional/merchant_service_photos.spec.ts`
Expected: FAIL with 404s from missing routes.

- [ ] **Step 3: Move `withUpload` to `server/app/helpers/uploads.ts`**

Export it; `merchant_photos_controller.ts` imports it instead of defining it. Run `cd server && npm test -- --files tests/functional/merchant_photos.spec.ts` → PASS.

- [ ] **Step 4: Export `withMenu` and `serviceNotFound` from `merchant_services.ts`; make `deleteService` drop files after commit**

`deleteService` captures `const dropped = service.photo` inside `withMenu`, and after `withMenu` resolves runs `if (dropped && isUploadedServicePhoto(dropped)) await deleteUploaded([dropped.storageKey])`. The 409 path throws inside the transaction, so nothing is deleted.

- [ ] **Step 5: Implement `server/app/services/service_photos.ts`**

Mirror `business_photos.ts`:

- `store(serviceId, file)`: `noFile` / `tooLarge` checks, `toWebpCopies`, write the three copies under `services/<serviceId>/<id>`, delete them if a write fails. Returns `{ storageKey }`.
- `setServicePhoto`: `store` first, then `withMenu(businessId, …)`: find the service by `{ id: serviceId, businessId }` (else `serviceNotFound()`), remember the old `photo`, set `service.photo = { storageKey }`, save, return `toServiceData(service)`. If `withMenu` throws, `deleteUploaded([storageKey])` and rethrow. After success, if the old photo `isUploadedServicePhoto`, `deleteUploaded`.
- `removeServicePhoto`: `withMenu`, find (else `serviceNotFound()`), if `!service.photo` throw `new ApiError(photoMessages.notFound, 404)`, set `photo = null`, save, return data; after commit delete the old files if uploaded.

Note that `store` runs before the lock, so an upload to a foreign or missing service writes files and then deletes them again on the 404. That matches the business flow and keeps the lock short. The test in Step 1 asserts the folder ends up empty.

- [ ] **Step 6: Add the controller and routes**

`MerchantServicePhotosController` with `update` (inside `withUpload`: `requireMember`, then `setServicePhoto(params.businessId, params.serviceId, file)`) and `destroy` (`requireMember`, then `removeServicePhoto`). Register the two routes next to the existing service routes in `server/start/routes.ts` with a lazy import like `MerchantServicesController`'s.

- [ ] **Step 7: Run the server suite**

Run: `cd server && npm run typecheck && npm run lint && npm test`
Expected: all PASS, including the new spec. Starting `npm run server:dev` once regenerates `server/.adonisjs` for the new controller; commit those generated files with the task.

- [ ] **Step 8: Commit**

```bash
git add server
git commit -m "Let members set and remove a service photo through the API"
```

---

### Task 3: Frontend service methods and hooks (HTTP and mock)

**Files:**

- Modify: `src/lib/api-client.ts` (export `fileForm`)
- Modify: `src/services/merchant-business.service.ts:55-59,116-129` (import `fileForm`, `checkPhotoFile`, `resizedPhoto` instead of local copies)
- Create: `src/services/mock/photos.ts`
- Modify: `src/services/merchant-services.service.ts` (interface, HTTP, mock)
- Modify: `src/features/merchant/api/service-queries.ts`
- Test: `src/services/merchant-services.service.test.ts`

**Interfaces:**

- Produces (`src/lib/api-client.ts`): `export function fileForm(file: File): FormData` (appends the file under `'file'`). `merchant-business.service.ts` drops its private copy.
- Produces (`src/services/mock/photos.ts`): `export function checkPhotoFile(file: File | undefined): asserts file is File` and `export async function resizedPhoto(file: File): Promise<string>`, moved verbatim from `merchant-business.service.ts`.
- Produces (`MerchantServicesService`):
  ```ts
  /** Sets or replaces the service's photo. Uploads straight away; nothing waits for the form. */
  setServicePhoto: (businessId: ID, serviceId: ID, file: File) => Promise<Service>
  removeServicePhoto: (businessId: ID, serviceId: ID) => Promise<Service>
  ```
  HTTP: `apiClient.put<Service>(\`${servicePath(businessId, serviceId)}/photo\`, fileForm(file))`and`apiClient.delete<Service>(\`${servicePath(…)}/photo\`)`.
Mock: `setServicePhoto`→`delay(600)`, `requireMember`, `checkPhotoFile(file)`, `const url = await resizedPhoto(file)`, then `updateMockDb`: `findService`, `service.photo = { url }`, return `structuredClone(service)`. `removeServicePhoto`→`delay(400)`, `requireMember`, `updateMockDb`: `findService`, if `!service.photo`throw`new ApiError(photoMessages.notFound, 404)`, `delete service.photo`, return clone.
- Produces (`src/features/merchant/api/service-queries.ts`):

  ```ts
  export function useSetServicePhotoMutation(businessId: string)
  // mutationFn: ({ serviceId, file }: { serviceId: string; file: File }) => merchantServicesService.setServicePhoto(businessId, serviceId, file)
  export function useRemoveServicePhotoMutation(businessId: string)
  // mutationFn: (serviceId: string) => merchantServicesService.removeServicePhoto(businessId, serviceId); meta: { showErrorToast: true }
  ```

  Both `onSuccess(service)` call a new private `replaceMenuService(queryClient, businessId, service)` that `setQueryData`s the menu with the returned service swapped in by id, then returns `invalidateMenu(queryClient, businessId)`. The set hook has no toast meta: the field shows its own error.

- [ ] **Step 1: Write the failing mock tests**

In `src/services/merchant-services.service.test.ts`, following its existing setup (sign in as the merchant mock user, reset the mock DB), add a `describe('photos')` with the same `vi.mock('@/lib/resize-image', …)` the profile page test uses (resolve to `'data:image/webp;base64,AA'`):

```ts
it('sets, keeps through an edit, and removes a service photo', async () => {
  const png = new File(['x'], 'a.png', { type: 'image/png' })
  const set = await merchantServicesService.setServicePhoto(BIZ, 'svc_hot_shave', png)
  expect(set.photo).toEqual({ url: 'data:image/webp;base64,AA' })

  const edited = await merchantServicesService.updateService(
    BIZ,
    'svc_hot_shave',
    input({ name: 'Towel Shave', categoryId: 'sub_beard', price: { type: 'fixed', amount: 200 }, durationMinutes: 30 }),
  )
  expect(edited.photo).toEqual(set.photo)

  const removed = await merchantServicesService.removeServicePhoto(BIZ, 'svc_hot_shave')
  expect(removed.photo).toBeUndefined()
  await expect(merchantServicesService.removeServicePhoto(BIZ, 'svc_hot_shave')).rejects.toMatchObject({
    status: 404,
    message: photoMessages.notFound,
  })
})

it('refuses files that aren’t photos or are too large', async () => {
  await expect(
    merchantServicesService.setServicePhoto(BIZ, 'svc_hot_shave', new File(['x'], 'a.gif', { type: 'image/gif' })),
  ).rejects.toMatchObject({ status: 422, message: photoMessages.notAPhoto })
  const big = new File([new Uint8Array(photoRules.maxBytes + 1)], 'big.png', { type: 'image/png' })
  await expect(merchantServicesService.setServicePhoto(BIZ, 'svc_hot_shave', big)).rejects.toMatchObject({
    status: 422,
    message: photoMessages.tooLarge,
  })
})

it('only members can change a photo', async () => {
  signInAs('customer')
  await expect(
    merchantServicesService.setServicePhoto(BIZ, 'svc_hot_shave', new File(['x'], 'a.png', { type: 'image/png' })),
  ).rejects.toMatchObject({ status: 403 })
})
```

`BIZ`, `signInAs` and `input()` already exist in that file; import `photoMessages` and `photoRules` from `@/config/photos`.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/services/merchant-services.service.test.ts`
Expected: FAIL, `setServicePhoto is not a function`.

- [ ] **Step 3: Implement the service layer**

Add `fileForm` to `api-client.ts`, create `src/services/mock/photos.ts`, point `merchant-business.service.ts` at both (its behaviour is unchanged; `npx vitest run src/services/merchant-business.service.test.ts` must stay green), then add the two methods to the interface, HTTP and mock objects as in Interfaces.

- [ ] **Step 4: Add the hooks**

Implement `replaceMenuService`, `useSetServicePhotoMutation` and `useRemoveServicePhotoMutation` in `service-queries.ts` as in Interfaces.

- [ ] **Step 5: Run the checks**

Run: `npx vitest run src/services && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "Add service photo methods to the merchant services service and its hooks"
```

---

### Task 4: The photo spot on the edit page

**Files:**

- Create: `src/features/merchant/components/FilePicker.tsx` (move `FilePicker` and `UploadingOverlay` out of `PhotosPanel.tsx`, exported)
- Modify: `src/features/merchant/components/profile/PhotosPanel.tsx` (import them)
- Create: `src/features/merchant/components/ServicePhotoField.tsx`
- Modify: `src/features/merchant/components/ServiceForm.tsx:122-330`
- Test: `src/routes/MerchantServiceEditorPage.test.tsx`, `src/routes/MerchantOnboardingPage.test.tsx`

**Interfaces:**

- Consumes: `useSetServicePhotoMutation`, `useRemoveServicePhotoMutation` (Task 3); `photoFileProblem` (`src/lib/photos.ts`); `getErrorMessage` (`src/lib/api-client.ts`); `categoryIconFor` (`src/config/category-icons.ts`); `ImageWithFallback`; the `alert-dialog` parts as `PhotosPanel` uses them.
- Produces (`FilePicker.tsx`): `export function FilePicker({ label, multiple, disabled, onFiles }: { label: string; multiple?: boolean; disabled?: boolean; onFiles: (files: File[]) => void })` and `export function UploadingOverlay()`, moved verbatim (the `accept` value and `pickerClass` move with them).
- Produces (`ServicePhotoField.tsx`):
  ```tsx
  export function ServicePhotoField({
    businessId,
    service,
    icon,
  }: {
    businessId: string
    service: Service
    icon: LucideIcon
  })
  ```
  Renders, in order: a `relative aspect-square w-40 overflow-hidden rounded-2xl bg-muted` tile with `ImageWithFallback src={service.photo?.url} srcSet={service.photo?.srcSet} sizes="160px" alt={service.name} icon={icon} className="size-full"` and `UploadingOverlay` while the set mutation is pending; an error line `<p role="alert" className="text-sm text-destructive">` when `problem` is set; a `FilePicker` labelled `'Add photo'` when there is no photo or `'Replace photo'` when there is, `disabled` while either mutation is pending; and, only when there is a photo, a `Button type="button" variant="outline" size="sm"` labelled `'Remove photo'` that opens an `AlertDialog` with title `'Remove this photo?'`, description `'It comes off your shop page straight away.'`, `Cancel` and `Remove` actions. Picking a file: `const rejected = photoFileProblem(file); setProblem(rejected); if (rejected) return; setPhoto.mutate({ serviceId: service.id, file }, { onError: (error) => setProblem(getErrorMessage(error)) })`. Confirming remove: `removePhoto.mutate(service.id)`. The field never touches react-hook-form. (`mutate`'s per-call callbacks don't run after unmount, so leaving mid-upload sets no state.)
- `ServiceForm.tsx` layout change: the `<fieldset disabled={isSubmitting}>` closes after the "Price and time" panel. The "On your shop page" panel moves after it, still only when `!simple`, and contains in order: `service ? <ServicePhotoField businessId={businessId} service={service} icon={categoryIconFor(categories.find((c) => c.id === service.categoryId))} /> : <p className="text-sm text-muted-foreground">You can add a photo after saving.</p>`, then a nested `<fieldset disabled={form.formState.isSubmitting} className="contents">` around the existing `FieldGroup` with the two switches.

- [ ] **Step 1: Write the failing editor tests**

In `src/routes/MerchantServiceEditorPage.test.tsx`, add the `vi.mock('@/lib/resize-image', …)` from the profile page test and a `describe('photo')` block. Helpers: `const png = () => new File(['x'], 'a.png', { type: 'image/png' })`; `const publicPhoto = async (id: string) => (await publicServices()).find((s) => s.id === id)?.photo`; `const withoutPhoto = (id: string) => updateMockDb((db) => { delete db.services.find((s) => s.id === id)!.photo })`.

```ts
it('uploads a photo as soon as it is picked, without saving the form', async () => {
  const user = userEvent.setup()
  withoutPhoto('svc_hot_shave')
  renderAt('/business/services/svc_hot_shave')
  await user.upload(await screen.findByLabelText('Add photo'), png())
  await waitFor(async () => expect(await publicPhoto('svc_hot_shave')).toEqual({ url: 'data:image/webp;base64,AA' }))
  expect(screen.getByLabelText('Replace photo')).toBeInTheDocument()
  expect(screen.queryByText('Changes to Hot Towel Shave saved.')).not.toBeInTheDocument()
})

it('shows why a file was refused and keeps the current photo', async () => {
  const user = userEvent.setup({ applyAccept: false })
  renderAt('/business/services/svc_mens_haircut')
  const before = await publicPhoto('svc_mens_haircut')
  await user.upload(await screen.findByLabelText('Replace photo'), new File(['x'], 'a.gif', { type: 'image/gif' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('That file isn’t a photo. Use JPG, PNG or WebP.')
  expect(await publicPhoto('svc_mens_haircut')).toEqual(before)
})

it('removes a photo after confirming', async () => {
  const user = userEvent.setup()
  renderAt('/business/services/svc_mens_haircut')
  await user.click(await screen.findByRole('button', { name: 'Remove photo' }))
  await user.click(screen.getByRole('button', { name: 'Remove' }))
  await waitFor(async () => expect(await publicPhoto('svc_mens_haircut')).toBeUndefined())
  expect(await screen.findByLabelText('Add photo')).toBeInTheDocument()
})

it('saving the form leaves the photo alone', async () => {
  const user = userEvent.setup()
  renderAt('/business/services/svc_mens_haircut')
  const before = await publicPhoto('svc_mens_haircut')
  await user.click(await screen.findByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText('Changes to Men’s Haircut saved.')).toBeInTheDocument()
  expect(await publicPhoto('svc_mens_haircut')).toEqual(before)
})

it('has no photo spot before the service exists', async () => {
  renderAt('/business/services/new')
  expect(await screen.findByText('You can add a photo after saving.')).toBeInTheDocument()
  expect(screen.queryByLabelText('Add photo')).not.toBeInTheDocument()
})
```

Check the seeded names (`Hot Towel Shave`, `Men’s Haircut` with the curly apostrophe) against `src/services/mock/seed/businesses.ts` and use them exactly.

- [ ] **Step 2: Write the failing onboarding assertion**

In `src/routes/MerchantOnboardingPage.test.tsx`, in the test that reaches the Services step and opens the quick add form, add: `expect(screen.queryByText('You can add a photo after saving.')).not.toBeInTheDocument()` and `expect(screen.queryByLabelText('Add photo')).not.toBeInTheDocument()`.

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/routes/MerchantServiceEditorPage.test.tsx src/routes/MerchantOnboardingPage.test.tsx`
Expected: the five new editor tests FAIL (no `Add photo` label, no note); the onboarding assertion passes already and stays as a guard.

- [ ] **Step 4: Move `FilePicker` and `UploadingOverlay`**

Create `src/features/merchant/components/FilePicker.tsx`, import them in `PhotosPanel.tsx`. Run `npx vitest run src/routes/MerchantProfilePage.test.tsx` → PASS.

- [ ] **Step 5: Implement `ServicePhotoField` and wire it into `ServiceForm`**

As in Interfaces. Keep the form's existing tests green (`npx vitest run src/routes/MerchantServiceEditorPage.test.tsx`).

- [ ] **Step 6: Run the full frontend check**

Run: `npx prettier --write src/features/merchant src/routes/MerchantServiceEditorPage.test.tsx src/routes/MerchantOnboardingPage.test.tsx && npm run check`
Expected: PASS.

- [ ] **Step 7: Try it against the real API**

With `npm run dev:all` running and the dev database reset in Task 1, sign in as the seeded owner, open a service's edit page, add, replace and remove a photo. If the browser can't be driven, use curl against `http://[::1]:3333/api/merchant/businesses/biz_good_cut/services/svc_hot_shave/photo` with `-F file=@public/images/shops/shop-the-good-cut-barbershop-cover-640.webp` after signing in, and confirm the public services JSON shows the new `photo`. Record what was checked in the task report.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "Add a photo spot to the service edit page that uploads on pick"
```

---

## Self-review notes

- Spec coverage: data shape and seeds (Task 1), customer spots with `srcSet` and `alt=""` (Task 1), endpoints, limits, file cleanup, seeded-photo handling, delete-service cleanup, `storageKey` hidden (Task 2), frontend methods, mock, hooks (Task 3), edit page spot, Add page note, `simple` exclusion, form independence, remove confirm, errors (Task 4). The spec's e2e line is satisfied by leaving e2e alone: the merchant journey only adds a service.
- Names used across tasks: `ServicePhoto`, `Service.photo`, `StoredServicePhoto`, `isUploadedServicePhoto`, `toPublicServicePhoto`, `withMenu`, `serviceNotFound`, `setServicePhoto`, `removeServicePhoto`, `fileForm`, `checkPhotoFile`, `resizedPhoto`, `useSetServicePhotoMutation`, `useRemoveServicePhotoMutation`, `FilePicker`, `UploadingOverlay`, `ServicePhotoField`. Each is defined in the task before it is consumed.

---

### Task 5: A photo on the Add service page, uploaded the moment the service is created

Added 2026-11-05 after the first build. The spec's decision 3 was revised: the Add page gets the same tile; picking a file holds it locally and it uploads right after the service is created on Save.

**Files:**

- Create: `src/features/merchant/components/PendingPhotoField.tsx`
- Modify: `src/features/merchant/components/ServicePhotoField.tsx` (accept an initial problem)
- Modify: `src/features/merchant/components/ServiceForm.tsx` (held photo state, submit flow, panel contents)
- Modify: `src/routes/MerchantServiceEditorPage.tsx` (pass the failure message from navigation state)
- Test: `src/routes/MerchantServiceEditorPage.test.tsx`

**Interfaces:**

- Consumes: `useSetServicePhotoMutation(businessId)` (`{ serviceId, file }`), `FilePicker`, `UploadingOverlay`, `ImageWithFallback`, `photoFileProblem`, `getErrorMessage`, `categoryIconFor`.
- Produces (`PendingPhotoField.tsx`):
  ```tsx
  export function PendingPhotoField({
    file,
    onChange,
    icon,
  }: {
    file?: File
    onChange: (file: File | undefined) => void
    icon: LucideIcon
  })
  ```
  Stateless apart from a `problem` string. Renders the same square tile as `ServicePhotoField` (`relative aspect-square w-40 overflow-hidden rounded-2xl bg-muted`, `ImageWithFallback` with `alt="Photo to upload"`, `icon`, `className="size-full"`), with `src` = an object URL for `file` built with `URL.createObjectURL` in a `useMemo`/effect and revoked with `URL.revokeObjectURL` when the file changes or on unmount; no `srcSet`. Under it: the `role="alert"` problem line when set; a `FilePicker` labelled `Add photo` (no file) or `Replace photo` (file held); and, only when a file is held, a `Button type="button" variant="outline" size="sm"` labelled `Remove photo` that calls `onChange(undefined)` with no dialog. Picking: `const rejected = photoFileProblem(file); setProblem(rejected); if (!rejected) onChange(file)`.
- `ServicePhotoField` gains an optional prop `initialProblem?: string`, used as the initial value of its `problem` state. Nothing else changes.
- `ServiceForm`:
  - New state `const [pendingPhoto, setPendingPhoto] = useState<File>()`, and `const setPhoto = useSetServicePhotoMutation(businessId)`.
  - The "On your shop page" panel (still only when `!simple`) renders `service ? <ServicePhotoField … initialProblem={photoProblem} /> : <PendingPhotoField file={pendingPhoto} onChange={setPendingPhoto} icon={categoryIconFor(categories.find((c) => c.id === categoryId))} />` where `categoryId` is the form's current `categoryId` value (add it to the existing `useWatch` list). The "You can add a photo after saving." note is gone.
  - New optional prop `photoProblem?: string`, forwarded to `ServicePhotoField` as `initialProblem`.
  - Submit flow, in the `else` branch (not `onSaved`), when `!service && pendingPhoto`: after `saved = await save.mutateAsync(...)`, `try { await setPhoto.mutateAsync({ serviceId: saved.id, file: pendingPhoto }) } catch (error) { toast.error(\`${saved.name} is on your menu, but the photo didn’t upload.\`); void navigate(\`/business/services/${encodeURIComponent(saved.id)}\`, { state: { photoProblem: getErrorMessage(error) } }); return }`. On success the existing toast and `navigate('/business/services')`run as today. The Save button's`loading`must stay on through the photo upload: use`form.formState.isSubmitting` as today (the handler is still awaiting), and disable both fieldsets as today.
- `MerchantServiceEditorPage`: `const { state } = useLocation()`; pass `photoProblem={(state as { photoProblem?: string } | null)?.photoProblem}` to `ServiceForm`.

- [ ] **Step 1: Write the failing tests**

In `src/routes/MerchantServiceEditorPage.test.tsx`, at the top of the file stub the object URL API, which jsdom lacks:

```ts
beforeAll(() => {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
})
```

Replace the test `has no photo spot before the service exists` with these, inside `describe('photo')`, reusing `png()`, `publicPhoto` and the existing form-filling steps from `adds a service that customers can see` (extract a small `fillNewService(user, name)` helper if that keeps the tests short):

```ts
it('adds a service with a photo in one trip', async () => {
  const user = userEvent.setup()
  const router = renderAt('/business/services/new')
  await fillNewService(user, 'Buzz Cut')
  await user.upload(screen.getByLabelText('Add photo'), png())
  expect(screen.getByRole('img', { name: 'Photo to upload' })).toHaveAttribute('src', 'blob:preview')
  expect(screen.getByLabelText('Replace photo')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Add service' }))
  expect(await screen.findByText('Buzz Cut is on your menu.')).toBeInTheDocument()
  await waitFor(() => expect(router.state.location.pathname).toBe('/business/services'))
  const created = (await publicServices()).find((s) => s.name === 'Buzz Cut')!
  expect(created.photo).toEqual({ url: 'data:image/webp;base64,AA' })
})

it('lets the merchant drop a held photo before saving', async () => {
  const user = userEvent.setup()
  renderAt('/business/services/new')
  await fillNewService(user, 'Buzz Cut')
  await user.upload(screen.getByLabelText('Add photo'), png())
  await user.click(screen.getByRole('button', { name: 'Remove photo' }))
  expect(screen.getByLabelText('Add photo')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Add service' }))
  expect(await screen.findByText('Buzz Cut is on your menu.')).toBeInTheDocument()
  expect((await publicServices()).find((s) => s.name === 'Buzz Cut')!.photo).toBeUndefined()
})

it('refuses a non-photo on the Add page without holding it', async () => {
  const user = userEvent.setup({ applyAccept: false })
  renderAt('/business/services/new')
  await user.upload(await screen.findByLabelText('Add photo'), new File(['x'], 'a.gif', { type: 'image/gif' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('That file isn’t a photo. Use JPG, PNG or WebP.')
  expect(screen.getByLabelText('Add photo')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
})

it('keeps the new service and lands on its edit page when the photo upload fails', async () => {
  const user = userEvent.setup()
  vi.spyOn(merchantServicesService, 'setServicePhoto').mockRejectedValueOnce(
    new ApiError('Photos can be up to 10 MB.', 422),
  )
  const router = renderAt('/business/services/new')
  await fillNewService(user, 'Buzz Cut')
  await user.upload(screen.getByLabelText('Add photo'), png())
  await user.click(screen.getByRole('button', { name: 'Add service' }))
  expect(await screen.findByText('Buzz Cut is on your menu, but the photo didn’t upload.')).toBeInTheDocument()
  await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/business\/services\/svc_/))
  expect(await screen.findByRole('alert')).toHaveTextContent('Photos can be up to 10 MB.')
  expect(screen.getByLabelText('Add photo')).toBeInTheDocument()
  expect((await publicServices()).find((s) => s.name === 'Buzz Cut')!.photo).toBeUndefined()
})
```

(`ApiError` from `@/lib/api-client`, `merchantServicesService` from `@/services/merchant-services.service`; the file already imports `vi`.) Keep the onboarding guard in `MerchantOnboardingPage.test.tsx` as is: the quick form must still show neither `Add photo` nor the old note.

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/routes/MerchantServiceEditorPage.test.tsx`
Expected: the four new tests FAIL (no `Add photo` label on the Add page).

- [ ] **Step 3: Implement `PendingPhotoField`, the `initialProblem` prop, the form flow and the page's location state**

As in Interfaces.

- [ ] **Step 4: Run the checks**

Run: `npx vitest run src/routes/MerchantServiceEditorPage.test.tsx src/routes/MerchantOnboardingPage.test.tsx && npx prettier --write src/features/merchant src/routes/MerchantServiceEditorPage.tsx src/routes/MerchantServiceEditorPage.test.tsx && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "Let a new service take its photo on the Add page and upload it once the service exists"
```
