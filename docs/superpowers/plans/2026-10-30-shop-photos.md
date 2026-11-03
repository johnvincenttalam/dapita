# Shop Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners upload, replace, remove and reorder their shop's cover and gallery photos. A shop can't be submitted or approved without a cover.

**Architecture:** Shared rules (limits, messages, checklist item, moderation blocker) live in `src/` and reach the server through `#shared/domain`, as the existing checklist does. The server stores resized WebP copies on local disk behind a tiny storage module, keeps a `storageKey` in the `photos` JSON, and builds public URLs when serializing. The frontend adds four service methods (HTTP and mock), one `PhotosPanel` component used by both the profile tab and the setup wizard, and photo-aware admin moderation.

**Tech Stack:** React 19 + TanStack Query + Vitest/RTL + Playwright (frontend). AdonisJS 7 + Lucid + Japa (server). `sharp` (new server dependency).

**Spec:** `docs/superpowers/specs/2026-10-30-shop-photos-design.md`

## Global Constraints

- Gallery holds at most **8** photos. The shop page shows the first **4**.
- Accepted: **JPEG, PNG, WebP**, up to **10 MB** (10 × 1024 × 1024 bytes) each. The server checks the real format from the content, not the extension or the declared MIME type.
- The server writes WebP copies at widths **320, 640, 1280** (`withoutEnlargement`). `url` is the 1280 copy, and `srcSet` is `"<320> 320w, <640> 640w, <1280> 1280w"`, matching the seed in `src/services/mock/seed/businesses.ts:29`.
- Alt text is generated, never typed: cover `"<Shop name>"`, gallery `"<Shop name>, photo <n>"` (n = 1-based position at upload time).
- Owner-facing copy uses the typographic apostrophe `’`, like the rest of the codebase.
- Every server behaviour has a mock twin in the matching `src/services/*.service.ts`, with the same limits and messages. Mock mode is the default and e2e runs on it.
- One business per owner. Use `useCurrentBusinessId()` / `user.memberships[0]` as today.
- Photo changes on approved shops go live immediately. No re-review.
- Commands: frontend `npm test`, `npm run typecheck`, `npm run lint`. Server `npm --prefix server test` (needs local PostgreSQL with the `dapita_test` DB; see `server/.env.test`) and `npm --prefix server run typecheck`.

### Copy (exact strings, defined once in Task 1 as `photoMessages`)

| key                  | text                                                   |
| -------------------- | ------------------------------------------------------ |
| `notAPhoto`          | `That file isn’t a photo. Use JPG, PNG or WebP.`       |
| `tooLarge`           | `Photos can be up to 10 MB.`                           |
| `galleryFull`        | `You can add up to 8 gallery photos.`                  |
| `noFile`             | `Choose a photo to upload.`                            |
| `notFound`           | `We couldn’t find that photo.`                         |
| `cantRemoveCover`    | `Your shop needs a cover photo. Replace it instead.`   |
| `staleOrder`         | `Your photos changed. Reload and try again.`           |
| `needsCoverToGoLive` | `This shop needs a cover photo before it can go live.` |

## Review Focus

1. **A renamed non-image** (a text file called `menu.jpg`, sent as `image/jpeg`). The owner expects a clear rejection, and nothing is written to disk or the row. Pinned in Task 4.
2. **Replacing a seeded cover** (a URL under `/images/...` with no `storageKey`). The owner expects the replace to succeed, and the server must never try to delete files outside the uploads root. Pinned in Task 4.
3. **Two gallery uploads at the same moment** (two tabs, or a retry racing the original). Both photos are kept, and the cap still holds at 8. Pinned in Task 4.
4. **Reordering with a stale list** (a photo removed in another tab). The owner gets `staleOrder` instead of a silently corrupted order. Pinned in Task 4 (server) and Task 5 (mock).
5. **Path traversal on the file route** (`/api/uploads/..%2F..%2F.env`). The owner expects a 404 and never a file outside the uploads root. Pinned in Task 3.

---

### Task 1: Shared photo rules and the cover-photo checklist item

**Files:**

- Create: `src/config/photos.ts`, `src/lib/photos.ts`, `src/lib/photos.test.ts`
- Modify: `src/lib/listing-checklist.ts`, `src/lib/listing-checklist.test.ts`, `server/app/shared/domain.ts`
- Modify (keep existing tests green): `server/tests/helpers.ts`, `server/tests/functional/merchant_listing.spec.ts:203-275`, `src/routes/MerchantOnboardingPage.test.tsx` (`finishListing`)

**Interfaces:**

- Produces:
  - `photoRules = { maxGalleryPhotos: 8, shownOnShopPage: 4, maxBytes: 10485760, acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'], widths: [320, 640, 1280] } as const`
  - `photoMessages: Record<'notAPhoto' | 'tooLarge' | 'galleryFull' | 'noFile' | 'notFound' | 'cantRemoveCover' | 'staleOrder' | 'needsCoverToGoLive', string>` (copy table above), in `src/config/photos.ts`
  - `photoFileProblem(file: { type: string; size: number }): string | undefined` returns `notAPhoto` or `tooLarge` or nothing. It's a browser-side pre-check by MIME type.
  - `photoAlt(shopName: string, kind: 'cover' | 'gallery', position?: number): string`
  - `hasCover(business: Pick<Business, 'photos'>): boolean`, in `src/lib/photos.ts`
  - `OnboardingStep` gains `'photos'`. The checklist item `{ step: 'photos', label: 'Cover photo', missing: 'Add a cover photo.' }` sits second, right after `details`.
  - The server test helper `giveCover(businessId: string): Promise<void>` in `server/tests/helpers.ts` appends a seed-style cover (`url: '/images/shops/shop-the-good-cut-barbershop-cover.webp'`, no `storageKey`).
  - Everything above is exported from `server/app/shared/domain.ts`.

- [ ] **Step 1: Write the failing tests**

`src/lib/listing-checklist.test.ts`: update `'lists everything a new listing still needs'` to expect `[['details', false], ['photos', false], ['hours', false], ['services', false], ['policies', false]]`. Add:

```ts
it('asks for a cover photo, and a gallery photo alone isn’t enough', () => {
  const gallery = { id: 'ph_1', url: '/x.webp', alt: 'x', kind: 'gallery' as const }
  expect(listingChecklist(draft({ photos: [gallery] }), []).items[1]).toMatchObject({
    step: 'photos',
    done: false,
    missing: 'Add a cover photo.',
  })
  expect(listingChecklist(draft({ photos: [{ ...gallery, kind: 'cover' }] }), []).items[1].done).toBe(true)
})
```

`src/lib/photos.test.ts`: `photoFileProblem({ type: 'image/gif', size: 1 })` → `photoMessages.notAPhoto`. `photoFileProblem({ type: 'image/png', size: 10485761 })` → `tooLarge`. `photoFileProblem({ type: 'image/webp', size: 10485760 })` → `undefined`. `photoAlt('Kulot Studio', 'cover')` → `'Kulot Studio'`. `photoAlt('Kulot Studio', 'gallery', 3)` → `'Kulot Studio, photo 3'`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/lib/listing-checklist.test.ts src/lib/photos.test.ts`
Expected: FAIL (module `@/lib/photos` not found; checklist has 4 items).

- [ ] **Step 3: Implement** `src/config/photos.ts` and `src/lib/photos.ts`, add the checklist item using `hasCover`, and add the exports to `server/app/shared/domain.ts`.

- [ ] **Step 4: Fix the tests that now need a cover**

- Server `'a new business can submit once its listing is complete'`: the early-submit message becomes `'Finish these first: business details, cover photo, services and cancellation policy.'`, and call `await giveCover(businessId)` before the final submit.
- `MerchantOnboardingPage.test.tsx` `finishListing`: add a cover with `updateMockDb((db) => { db.businesses.find((b) => b.id === id)!.photos.push({ id: 'ph_test', url: '/images/shops/shop-the-good-cut-barbershop-cover.webp', alt: 'Lea’s Nail Bar', kind: 'cover' }) })`.
- `'lists what’s missing…'` still passes. Its first missing line is unchanged.

- [ ] **Step 5: Run everything**

Run: `npm test` and `npm --prefix server test -- --files merchant_listing`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config/photos.ts src/lib/photos.ts src/lib/photos.test.ts src/lib/listing-checklist.ts src/lib/listing-checklist.test.ts server/app/shared/domain.ts server/tests/helpers.ts server/tests/functional/merchant_listing.spec.ts src/routes/MerchantOnboardingPage.test.tsx
git commit -m "Require a cover photo in the listing checklist"
```

---

### Task 2: Admins can't approve or reinstate a shop without a cover

**Files:**

- Modify: `src/lib/moderation.ts`, `server/app/shared/domain.ts`, `server/app/services/admin_merchants.ts:130-170`, `src/services/admin.service.ts` (`moderateMerchant`), `src/routes/AdminMerchantReviewPage.tsx`
- Test: `server/tests/functional/admin.spec.ts`, `src/services/admin.service.test.ts`, `src/routes/AdminMerchantsPage.test.tsx` (or a new `src/routes/AdminMerchantReviewPage.test.tsx` following its setup)

**Interfaces:**

- Consumes: `hasCover`, `photoMessages.needsCoverToGoLive` (Task 1), `giveCover` (Task 1)
- Produces: `moderationBlocker(action: ModerationActionType, business: Pick<Business, 'photos'>): string | undefined` in `src/lib/moderation.ts` (exported from shared domain). It returns `needsCoverToGoLive` for `approve`/`reinstate` when `!hasCover(business)`.

- [ ] **Step 1: Write the failing tests**

- Server: in `'approving a listing records why and makes it public'` and every other test that approves `biz_kulot` (lines ~109 and ~162), call `await giveCover(kulotId)` first. Add `'a listing without a cover photo can’t be approved'`: POST approve on `biz_kulot` (seeded with no cover) → 422, body `{ message: 'This shop needs a cover photo before it can go live.' }`, and the status is still `pending_review`.
- Mock (`admin.service.test.ts`): same pair. Give kulot a cover with `updateMockDb` before the existing approve test, and add the 422 test.
- Page: render `/admin/merchants/biz_kulot` as admin. The `Approve` button is disabled, the text `This shop needs a cover photo before it can go live.` is visible, and `Request changes` is enabled. A `Photos` panel shows `No cover photo yet.`

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/services/admin.service.test.ts src/routes/AdminMerchantsPage.test.tsx` and `npm --prefix server test -- --files admin`
Expected: the new tests FAIL (approve succeeds; no disabled button).

- [ ] **Step 3: Implement**

- `moderationBlocker` goes in `moderation.ts`.
- In `moderateMerchant`, after the `rule.from` check, throw `new ApiError(blocker, 422)`. Do the same in the mock.
- In `AdminMerchantReviewPage`:
  - Disable an action button when `moderationBlocker(item, business)` returns text, and render that text once under the buttons (`text-sm text-muted-foreground`).
  - Add a `Panel title="Photos"` above "Services" with the cover (`ImageWithFallback`, `aspect-[16/9] rounded-2xl`, using `srcSet`) and the gallery thumbnails in a 4-column grid, or `No cover photo yet.`

- [ ] **Step 4: Run them and confirm they pass**

Same commands. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/moderation.ts server/app/shared/domain.ts server/app/services/admin_merchants.ts src/services/admin.service.ts src/routes/AdminMerchantReviewPage.tsx server/tests/functional/admin.spec.ts src/services/admin.service.test.ts src/routes/AdminMerchant*.test.tsx
git commit -m "Block approving a shop that has no cover photo"
```

---

### Task 3: Server photo storage, image copies and the public file route

**Files:**

- Create: `server/app/helpers/photos.ts`, `server/app/services/photo_storage.ts`, `server/app/services/photo_images.ts`, `server/app/controllers/uploads_controller.ts`, `server/tests/functional/uploads.spec.ts`
- Modify: `server/package.json` (add `sharp`), `server/start/env.ts`, `server/.env.example`, `server/.env.test`, `server/.gitignore`, `server/start/routes.ts` (public group), `server/app/models/business.ts`, `server/app/services/businesses.ts` (`toBusinessData`), `server/app/services/shops.ts:232`, `server/README.md` ("Before a real deployment")

**Interfaces:**

- Produces:
  - `type StoredPhoto = BusinessPhoto | (Omit<BusinessPhoto, 'url' | 'srcSet'> & { storageKey: string })`
  - `isUploaded(photo: StoredPhoto): photo is …storageKey…`
  - `toPublicPhoto(photo: StoredPhoto): BusinessPhoto`: for uploaded photos, `url = ${base}/${storageKey}-1280.webp` and `srcSet` from the three widths, where `base = env.get('UPLOADS_PUBLIC_URL') ?? '/api/uploads'`. It drops `storageKey` and passes seeded photos through unchanged. In `server/app/helpers/photos.ts`.
  - `Business.photos: StoredPhoto[]`. New getter `publicPhotos: BusinessPhoto[]`, and `coverPhoto` now returns a public photo.
  - `uploadsRoot(): string` (from `UPLOADS_DIR`, default `storage/uploads`, resolved with `app.makePath`).
  - `putFile(relativePath: string, data: Buffer): Promise<void>` (creates directories).
  - `deleteUploaded(storageKeys: string[]): Promise<void>`: deletes `<key>-<w>.webp` for each width, and logs failures without throwing.
  - `resolveUploadPath(relativePath: string): string | undefined`: `undefined` when the path escapes the root. All in `photo_storage.ts`.
  - `toWebpCopies(filePath: string): Promise<Record<320 | 640 | 1280, Buffer>>`: throws `ApiError(photoMessages.notAPhoto, 422)` unless sharp reads it as `jpeg`/`png`/`webp`. It calls `.rotate()` (EXIF) and strips metadata by default. In `photo_images.ts`.
  - Route `GET /api/uploads/*` (public), served with `Cache-Control: public, max-age=31536000, immutable`, or 404 `ApiError('Not found.', 404)`.

- [ ] **Step 1: Install and configure**

Run `npm --prefix server install sharp`. Add `UPLOADS_DIR: Env.schema.string.optional()` and `UPLOADS_PUBLIC_URL: Env.schema.string.optional()` to `start/env.ts`, with commented examples in `.env.example`. Add `UPLOADS_DIR=tmp/test-uploads` to `.env.test` and `storage/` to `server/.gitignore`. Add a README bullet: local disk storage doesn't survive redeploys on most hosts, so use a persistent volume or a cloud driver, and set `UPLOADS_PUBLIC_URL` if files are served from another origin.

- [ ] **Step 2: Write the failing tests** in `server/tests/functional/uploads.spec.ts`

- `'serves an uploaded file with long-lived caching'`: `putFile('businesses/biz_x/ph_1-640.webp', buffer)` → GET `/api/uploads/businesses/biz_x/ph_1-640.webp` returns 200 with that cache header.
- `'never serves files outside the uploads folder'`: GET `/api/uploads/..%2F..%2F.env` and `/api/uploads/../package.json` → 404.
- `'turns a photo into three WebP widths and rejects a renamed text file'`: `toWebpCopies(app.makePath('..', 'public/images/shops/shop-the-good-cut-barbershop-cover.webp'))` → `sharp(copies[320]).metadata()` has `width <= 320` and `format === 'webp'`. A tmp file `menu.jpg` containing `'hello'` → rejects with status 422 and the message `notAPhoto`.
- `'shop data shows uploaded photos as public URLs'`: set Good Cut's photos to `[{ id: 'ph_up', alt: 'a', kind: 'cover', storageKey: 'businesses/biz_good_cut/ph_up' }]` → GET `/api/shops/<slug>` gives `photos[0].url === '/api/uploads/businesses/biz_good_cut/ph_up-1280.webp'`, a `srcSet` containing `-320.webp 320w`, and no `storageKey`.
- Group teardown removes `uploadsRoot()`.

- [ ] **Step 3: Run them and confirm they fail**

Run: `npm --prefix server test -- --files uploads`
Expected: FAIL (modules missing, 404 on the route).

- [ ] **Step 4: Implement** the files above. Serializers switch `business.photos` to `business.publicPhotos` in `toBusinessData` and `shops.ts:232`. `coverPhoto` users (`shops.ts:104`, `bookings.ts:171`, `conversations.ts:88`) keep working through the getter.

- [ ] **Step 5: Run the server tests and typecheck**

Run: `npm --prefix server test` and `npm --prefix server run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/package-lock.json server/start server/.env.example server/.env.test server/.gitignore server/app server/tests/functional/uploads.spec.ts server/README.md
git commit -m "Store shop photos on disk as resized WebP copies and serve them"
```

---

### Task 4: Server endpoints to set the cover and manage the gallery

**Files:**

- Create: `server/app/services/business_photos.ts`, `server/app/controllers/merchant_photos_controller.ts`, `server/tests/functional/merchant_photos.spec.ts`
- Modify: `server/app/services/businesses.ts` (export `change`), `server/start/routes.ts` (merchant group)

**Interfaces:**

- Consumes: Task 3's storage, images and `StoredPhoto`. Task 1's `photoRules`, `photoMessages`, `photoAlt`.
- Produces:
  - Routes (members only, via `requireMember`), each returning the updated `Business`:
    - `PUT businesses/:businessId/photos/cover`
    - `POST businesses/:businessId/photos`
    - `DELETE businesses/:businessId/photos/:photoId`
    - `PUT businesses/:businessId/photos/order` with body `{ ids: string[] }`
  - The multipart field name is **`file`**.
  - Service functions in `business_photos.ts`:
    - `setCover(businessId: ID, file: MultipartFile | null)`
    - `addGalleryPhoto(businessId: ID, file: MultipartFile | null)`
    - `removePhoto(businessId: ID, photoId: ID)`
    - `reorderGallery(businessId: ID, input: unknown)`
    - All return `Promise<BusinessData>`.

Flow for uploads:

1. No file → `noFile` (422). `file.size > maxBytes` → `tooLarge` (422).
2. Run `toWebpCopies(file.tmpPath)`, then `putFile` each copy under `businesses/<businessId>/<newId('ph')>`.
3. Inside `change()`, apply the edit and check the gallery cap there (under the row lock).
4. If `change()` throws, `deleteUploaded([newKey])` and rethrow. After success, `deleteUploaded` the keys of any replaced or removed uploaded photo. Seeded photos have no key, so nothing gets deleted for them.

Errors:

- `removePhoto` on the cover → `cantRemoveCover` (422). Unknown id → `notFound` (404).
- `reorderGallery`: `ids` must be the same set as the current gallery ids, with no duplicates, otherwise `staleOrder` (422). The cover stays first in the array, followed by the gallery in the new order.

- [ ] **Step 1: Write the failing tests** in `merchant_photos.spec.ts`

Use fixture `app.makePath('..', 'public/images/shops/shop-the-good-cut-barbershop-cover-640.webp')`, `UPLOADS_DIR` from `.env.test`, and the owner of `biz_good_cut`. Use `.file('file', path)` for uploads.

- `'replaces a seeded cover with an upload'`: PUT cover → 200, and the cover `url` starts with `/api/uploads/businesses/biz_good_cut/`. The old seeded file under `public/images/shops/` still exists (Review Focus 2).
- `'replacing an uploaded cover deletes the old files'`: PUT twice → the first upload's `-1280.webp` is gone from `uploadsRoot()`.
- `'adds gallery photos up to 8, then refuses'`: 8 POSTs → 200, the 9th → 422 `galleryFull`. Alt is `'The Good Cut Barbershop, photo 1'`.
- `'keeps both photos when two uploads land at once'`: `Promise.all` of two POSTs → both 200, and the gallery has 2 more (Review Focus 3).
- `'rejects a text file named like a photo and stores nothing'`: tmp `menu.jpg` with text → 422 `notAPhoto`, no new files under `businesses/biz_good_cut/`, and the photos are unchanged (Review Focus 1).
- `'rejects a file over 10 MB'`: an 11 MB buffer file → 422 `tooLarge`.
- `'won’t remove the cover; removes a gallery photo and its files'`: DELETE the cover → 422 `cantRemoveCover`. DELETE a gallery photo → 200 and its files are gone. DELETE an unknown id → 404.
- `'reorders the gallery and refuses a stale order'`: valid reversed ids → 200 in the new order with the cover still first. Ids missing one photo → 422 `staleOrder` (Review Focus 4).
- `'only members can manage photos'`: the customer gets 403 on all four.
- Teardown removes `uploadsRoot()`.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npm --prefix server test -- --files merchant_photos`
Expected: FAIL (404 routes).

- [ ] **Step 3: Implement** the service, controller (`request.file('file')`, `formBody(request)` for reorder) and routes.

- [ ] **Step 4: Run the server tests and typecheck**

Run: `npm --prefix server test` and `npm --prefix server run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/app server/start/routes.ts server/tests/functional/merchant_photos.spec.ts
git commit -m "Add merchant endpoints for the cover and gallery photos"
```

---

### Task 5: Frontend service methods (HTTP and mock) and query hooks

**Files:**

- Create: `src/lib/resize-image.ts`, `src/lib/api-client.test.ts`
- Modify: `src/lib/api-client.ts`, `src/services/merchant-business.service.ts`, `src/services/merchant-business.service.test.ts`, `src/features/merchant/api/business-queries.ts`

**Interfaces:**

- Consumes: Task 1 helpers. Task 4's routes and the `file` field.
- Produces:
  - `apiClient` sends a `FormData` body as is, with no JSON `Content-Type`.
  - `resizeImageToDataUrl(file: File, maxWidth?: number /* 1280 */): Promise<string>` (createImageBitmap + canvas, `image/webp`, quality 0.8). Mock only. Tests `vi.mock` it.
  - `MerchantBusinessService` gains:
    - `setCoverPhoto(businessId: ID, file: File): Promise<Business>`
    - `addGalleryPhoto(businessId: ID, file: File): Promise<Business>`
    - `removePhoto(businessId: ID, photoId: ID): Promise<Business>`
    - `reorderGallery(businessId: ID, ids: ID[]): Promise<Business>`
  - Hooks:
    - `useSetCoverPhotoMutation(businessId)` (`File`)
    - `useAddGalleryPhotoMutation(businessId)` (`File`)
    - `useRemovePhotoMutation(businessId)` (`string`, `showErrorToast: true`)
    - `useReorderGalleryMutation(businessId)` (`string[]`, `showErrorToast: true`)
    - All built on `useBusinessMutation`.

- [ ] **Step 1: Write the failing tests**

- `api-client.test.ts`: stub `fetch`. `apiClient.post('/x', formData)` passes the same `FormData` instance as `body`, and the headers have no `Content-Type`. `apiClient.post('/x', { a: 1 })` still sends JSON.
- `merchant-business.service.test.ts` (mock, merchant session, `vi.mock('@/lib/resize-image', () => ({ resizeImageToDataUrl: async () => 'data:image/webp;base64,AA' }))`):
  - `setCoverPhoto` replaces the one cover.
  - 8 `addGalleryPhoto` calls succeed, and the 9th rejects with `photoMessages.galleryFull`.
  - A `new File(['x'], 'a.gif', { type: 'image/gif' })` rejects with `notAPhoto`.
  - `removePhoto` on the cover rejects with `cantRemoveCover`.
  - `reorderGallery` with a stale list rejects with `staleOrder` (Review Focus 4), and a valid one reorders.
  - A non-member business rejects with 403.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/lib/api-client.test.ts src/services/merchant-business.service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** HTTP methods build `FormData` with `file`. The mock validates with `photoFileProblem`, stores `{ id: createMockId('ph'), url: dataUrl, alt: photoAlt(...), kind }`, and mirrors the server's ordering and errors.

- [ ] **Step 4: Run them and confirm they pass,** then `npm run typecheck`
      Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/resize-image.ts src/lib/api-client.ts src/lib/api-client.test.ts src/services/merchant-business.service.ts src/services/merchant-business.service.test.ts src/features/merchant/api/business-queries.ts
git commit -m "Add photo upload, removal and reordering to the merchant business service"
```

---

### Task 6: The Photos tab on Business profile

**Files:**

- Create: `src/features/merchant/components/profile/PhotosPanel.tsx`
- Modify: `src/routes/MerchantProfilePage.tsx` (tabs), `src/routes/MerchantProfilePage.test.tsx`

**Interfaces:**

- Consumes: Task 5 hooks, Task 1 `photoRules` / `photoFileProblem` / `hasCover`.
- Produces: `PhotosPanel({ business, onContinue }: { business: Business; onContinue?: () => void })`. When `onContinue` is given, it renders a `Continue` button that's disabled until `hasCover(business)` (used by Task 7).

Behaviour (copy is exact):

- **Cover `Panel`, title `Cover photo`:**
  - With no cover: an empty drop area reading `Add a cover photo. It’s the first thing customers see.` When the status is `draft` or `changes_requested`, add `You need one to submit your listing.`
  - The file input is labelled `Add a cover photo`, or `Replace cover photo` once a cover exists.
- **Gallery `Panel`, title `Gallery`, description `Up to 8 photos of your space, your work and your team. The first 4 show on your shop page.`:**
  - The tile list is `aria-label="Gallery photos"`. Each tile has buttons labelled `Move photo <n> earlier`, `Move photo <n> later` (hidden at the ends) and `Remove photo <n>`. Tiles are also draggable with native drag events, and a drop calls reorder.
  - The add input is labelled `Add photos`, is `multiple`, and only shows while under 8.
- **Accepted files:** `accept="image/jpeg,image/png,image/webp"`. Files failing `photoFileProblem` get an error tile with that message.
- **Multi-select:** when more files are picked than the free slots, upload only the first N and show `You can add up to 8 gallery photos, so <k> weren’t added.`
- **Uploads run one at a time** (a queue). This keeps each response the newest state of the business. Each pending file shows a tile with a spinner and `Uploading…`. A failure shows the error and a `Try again` button.
- **Remove** opens an `AlertDialog` (`@/components/ui/alert-dialog`): title `Remove this photo?`, description `It comes off your shop page straight away.`, actions `Cancel` / `Remove`.

- [ ] **Step 1: Write the failing tests** in `MerchantProfilePage.test.tsx`, using `vi.mock('@/lib/resize-image', …)` as in Task 5

- `'adds a gallery photo and shows it on the shop page'`: open `?tab=photos`, `user.upload(screen.getByLabelText('Add photos'), new File(['x'], 'a.png', { type: 'image/png' }))` → `within(getByRole('list', { name: 'Gallery photos' })).getAllByRole('listitem')` has one more item, and `shopsService.getShop(SLUG)` includes the photo.
- `'replaces the cover photo'`: upload to `Replace cover photo` → the shop's cover `url` is the mocked data URL.
- `'only adds as many photos as fit'`: seed 7 gallery photos via `updateMockDb`, upload 3 files → 1 is added, and the text `You can add up to 8 gallery photos, so 2 weren’t added.` is shown.
- `'rejects a file that isn’t a photo'`: upload a `text/plain` file (`applyAccept: false`) → `That file isn’t a photo. Use JPG, PNG or WebP.`
- `'removes a photo after confirming'`: click `Remove photo 1` → dialog → `Remove` → one fewer item.
- `'moves a photo earlier'`: seed 2 photos, click `Move photo 2 earlier` → the order in the mock DB is swapped.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/routes/MerchantProfilePage.test.tsx`
Expected: FAIL (no Photos tab).

- [ ] **Step 3: Implement** `PhotosPanel`, and add `{ value: 'photos', label: 'Photos' }` to `tabs` right after `details`, rendering `<PhotosPanel business={profile.data.business} />`. Follow `DESIGN.md` and the existing profile panels (`Panel`, rounded-2xl images, `ImageWithFallback` with `srcSet`).

- [ ] **Step 4: Run** `npm test`, `npm run typecheck` and `npm run lint`
      Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/merchant/components/profile/PhotosPanel.tsx src/routes/MerchantProfilePage.tsx src/routes/MerchantProfilePage.test.tsx
git commit -m "Add a Photos tab where owners manage their cover and gallery"
```

---

### Task 7: Photos step in the setup wizard

**Files:**

- Modify: `src/routes/MerchantOnboardingPage.tsx` (`steps`, `Wizard`), `src/routes/MerchantOnboardingPage.test.tsx`, `e2e/app.spec.ts:128-165`

**Interfaces:**

- Consumes: `PhotosPanel` with `onContinue` (Task 6), the `'photos'` checklist step (Task 1).

- [ ] **Step 1: Write the failing tests**

- Update `'starts with the details and moves on once they’re saved'` so saving details lands on `?step=photos`.
- Add `'asks for a cover photo before moving on to the hours'`: at `?step=photos`, `Continue` is disabled. Upload to `Add a cover photo` → `Continue` is enabled → click → URL `?step=hours`.
- Add `'points back to the photos step when the cover is missing'`: at `?step=review` for a listing finished except for the cover, a link `Fix cover photo` has href `/business/onboarding?step=photos`. Mirror how the existing test finds `Fix business details`. If the link text is built from the label, it reads `Fix cover photo`.
- e2e `'a business owner signs up, sets up the listing and submits it for review'`: after the details save, `await page.getByLabel('Add a cover photo').setInputFiles('public/images/shops/shop-the-good-cut-barbershop-cover-640.webp')`, wait until `Continue` is enabled, then click it before the hours step.

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/routes/MerchantOnboardingPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement.** Insert `{ value: 'photos', label: 'Photos' }` after `details` in `steps`. The details step's `onSaved` goes to `'photos'`. Add a `step === 'photos'` branch rendering `<PhotosPanel business={profile.business} onContinue={() => go('hours')} />`.

- [ ] **Step 4: Run** `npm test`, `npm run typecheck`, `npm run lint` and `npm run test:e2e -- e2e/app.spec.ts`
      Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/MerchantOnboardingPage.tsx src/routes/MerchantOnboardingPage.test.tsx e2e/app.spec.ts
git commit -m "Add a Photos step to listing setup"
```

---

### Task 8: Whole-branch check

- [ ] **Step 1:** Run `npm run check`, `npm --prefix server test`, `npm --prefix server run typecheck` and `npm run test:e2e`. All must pass.
- [ ] **Step 2:** Manually, with `npm run dev:all` against the real API:
  - As the Good Cut owner, upload a large phone JPEG as the cover. It shows on `/shops/the-good-cut-barbershop`, and the network tab shows a card loading the `-640.webp` copy.
  - Add 5 gallery photos and reorder them. The shop page shows the first 4 in the new order.
  - Use `npm run dev` (mock mode) to repeat the cover upload.
- [ ] **Step 3:** Commit any fixes, with a message saying what each fixes.
