# Service photos: merchants add one photo per service

Date: 2026-11-03
Status: reviewed, awaiting approval

## Why

Every service row on a shop page, the service detail page and the booking form header show a photo. Only seeded services have one: `Service.photoUrl` is filled by the seed from `public/images/services/` and nothing else writes it. Creating a service sets it to null, updating a service never touches it, and the editor has no photo field. So every service a real merchant adds shows the category icon on the blush gradient, and a shop with ten real services looks like a placeholder next to the demo shops.

The shop photos feature (`docs/superpowers/specs/2026-10-30-shop-photos-design.md`, merged 2026-11-03) built the pieces this needs: content-sniffed uploads resized to 320/640/1280 WebP copies (`server/app/services/photo_images.ts`), local storage served at `/api/uploads/...` (`server/app/services/photo_storage.ts`, `uploads_controller.ts`), shared limits and messages (`src/config/photos.ts`), a browser-side resize for mock mode (`src/lib/resize-image.ts`) and a `FormData`-aware `apiClient`. This feature reuses all of it.

## Goals

- A merchant opens a service they already have, adds a photo, and it's live. No separate Save.
- One photo per service. It can be replaced or removed.
- The photo shows wherever the seeded service photos show today: the service row on the shop page, the service detail page and the booking form header, with small copies for small spots.
- Mock mode (`VITE_USE_MOCKS`, the default) can demo it.

## Non-goals

- A gallery per service. One photo only.
- Photos in the setup wizard's quick "add a service" form (`ServiceForm` with `simple`). The wizard is for getting the list up fast; photos come later from the Services page.
- Requiring photos anywhere. A service without one keeps the category icon fallback, the listing checklist doesn't mention service photos, and admin moderation ignores them.
- Cropping or editing in the browser, and no server-side cropping to a square either. Copies are resized by width only, exactly like shop photos, and the customer spots crop with CSS as they do today.
- Re-reviewing approved shops when a service photo changes. Photos go live immediately, like every other service edit.

## Anti-goals (would count as failure even if it works)

- The merchant has to press Save after picking a photo, or the photo is lost when they leave the page without saving.
- A failed upload or replace leaves the service with no photo when it had one.
- Deleting a service leaves its files on disk.
- Full-size uploads served to the 64 px service row.

## Decisions made with the user

1. **Flow:** the merchant taps a service on their Services page, which opens the existing edit page, adds a photo there, done.
2. **Upload right away.** Picking a file uploads it immediately. Nothing waits for the form's Save button.
3. **New services:** the Add service page has the same photo spot. Picking a file there holds it with a local preview, and it uploads the moment the service is created on Save, so adding a service with a photo is one trip. _(Revised 2026-11-05 after seeing the first build, which showed "You can add a photo after saving." and sent the merchant back through the list for every new service.)_
4. **Optional everywhere.** Nothing nags about missing photos.
5. **Everything else below is our call**, made during the conversation and accepted without changes.

## Behaviour

### Edit service page (merchant)

`src/features/merchant/components/ServiceForm.tsx`, rendered by `MerchantServiceEditorPage` at `/business/services/:serviceId`. The photo spot sits at the **top of the "On your shop page" panel**, since that panel is already about how the service looks to customers. It renders whenever `simple` is false. With an existing service it uploads on pick, as below. On the Add service page (`/business/services/new`, `service` undefined) it shows the same tile, but picking a file only holds it: the tile previews the file locally, the label switches to **Replace photo**, and a **Remove photo** button clears it with no dialog (nothing has been uploaded). Browser-side refusals from `photoFileProblem` show under the tile as on the edit page. On Save, the service is created first, then the held photo uploads to it right away, then the usual toast and return to the list. If that upload fails after the service was created, the toast reads "<name> is on your menu, but the photo didn’t upload." and the page goes to the new service's edit page with the failure message under the tile, so the merchant can retry without losing the service.

- **Empty:** a square tile showing the category icon on the usual fallback, with an **Add photo** button that opens the file picker (`accept` from `photoRules.acceptedTypes`). Picking a file uploads it straight away. While uploading, the tile shows a busy state and the button is disabled. On success the tile shows the photo.
- **Filled:** the photo in a square tile, with **Replace** and **Remove** buttons. Replace opens the picker and uploads; the old photo stays visible until the new one lands, then swaps. Remove asks once in the project's `alert-dialog` ("Remove this photo?"), then deletes on the server. No undo.
- **Errors:** checked in the browser first with `photoFileProblem` from `src/lib/photos.ts`, then by the server. The message shows under the tile and the previous photo, if any, stays. Messages come from `photoMessages` in `src/config/photos.ts` (`notAPhoto`, `tooLarge`, `noFile`).
- **Independence from the form:** the photo spot has no react-hook-form field. Uploading, replacing or removing a photo doesn't mark the form dirty, doesn't change its validity and isn't affected by the form's `isSubmitting` state. The panel currently sits inside `<fieldset disabled={isSubmitting}>`, so the tile must live outside that fieldset, or the fieldset gets split; its buttons are `type="button"` so they never submit the form. Saving the form never sends the photo. The form's Cancel and Save behave exactly as today.
- **Leaving mid-upload:** _(our call)_ the upload request is already in flight and the server finishes it either way. The component must not update state after unmount. No "wait for upload" guard is needed for a single file.
- **Who can edit:** anyone who passes `requireMember`, the same as the rest of the service menu.
- **Alt text:** no field, and no `alt` in the data. The three customer spots keep `alt=""`, because the photo sits beside the service name and is decorative, the same rule the shop cover follows in `ImageWithFallback`. The editor tile uses the service name as its alt. _(Our call, after the builder check.)_

### Services page (merchant)

`src/routes/MerchantServicesPage.tsx` doesn't show photos today. _(Our call)_ it stays that way. The photo is managed on the edit page only.

### Customer side

`ServiceRow` (`src/features/shops/components/ServiceRow.tsx`, 64 px square), `ServicePage` (`src/routes/ServicePage.tsx`, 16:9 on phones and 128 px square from `sm`) and `BookingRequestForm` (`src/features/booking/components/BookingRequestForm.tsx`, 64 px square) switch from `photoUrl` to the new `photo` shape and pass its `srcSet` to `ImageWithFallback`, which already supports it for shop photos. The CSS crop they use today stays, so any landscape or square upload looks right in all three. The fallback icon stays for services without a photo.

### Deleting and hiding a service

`deleteService` (only for services nobody has booked) also deletes the photo's files after the row is gone. Hiding a service (`active: false`) keeps the photo. Deleting a business is out of scope, as it is today.

## Data shape

### Shared type (`src/types/business.ts`)

Replace `photoUrl?: string` on `Service` with:

```ts
export interface ServicePhoto {
  url: string
  /** Smaller copies for rows and the booking header, as an `srcset`. Absent for seeded photos. */
  srcSet?: string
}

// on Service:
photo?: ServicePhoto
```

There's no `alt` in the shape: every place that shows the photo either treats it as decorative or has the service name at hand.

### Server

- The `services` table's `photo_url` string column becomes a nullable JSON column `photo`, via a new migration. Nothing in a real database holds a value today (only the seed writes it, through `db:reset`), so the migration can drop and add without copying data, and the seeder (`server/database/seeders/main_seeder.ts`) writes the new shape for seeded services: `{ url: '/images/services/service-<id>.webp' }`.
- Stored shape follows `server/app/helpers/photos.ts`: an uploaded photo holds `{ storageKey }` (server-only); a seeded photo holds `{ url }`. Generalise `toPublicPhoto` / `isUploaded` or add a small sibling for services so `url` and `srcSet` are built at serialization from `UPLOADS_PUBLIC_URL`, exactly as business photos are. `storageKey` is never sent to clients.
- There is one serializer, `toServiceData` in `server/app/services/shops.ts` (line 48 today, `photoUrl: service.photoUrl ?? undefined`), which `merchant_services.ts` imports too. It sends `photo` built from the stored shape, or omits it.
- `createService` stores `photo: null`; `updateService` keeps ignoring it, as it ignores `photoUrl` today. The service input schema (`src/schemas/service.ts`) doesn't change.
- Files live under the existing uploads root, keyed per service, for example `services/<serviceId>/<fresh-name>-<width>.webp`. _(Builder's call on the exact layout, as long as every upload gets a fresh name so caches never serve a stale image.)_

### Mock mode

- `src/services/mock/seed/businesses.ts:501` writes `photo: { url: ... }` instead of `photoUrl`.
- The mock `MerchantServicesService` gains the two photo methods. It validates with `photoFileProblem`, resizes with `resizeImageToDataUrl`, stores `{ url: <data URL> }` with no `srcSet`, and uses the same messages. It refuses files it can't decode with `photoMessages.notAPhoto`, as the business mock does.

## API (under `/api/merchant/businesses/:businessId/services/:serviceId`, members only)

| Method   | Path     | Body             | Effect                                                                  |
| -------- | -------- | ---------------- | ----------------------------------------------------------------------- |
| `PUT`    | `/photo` | multipart `file` | Sets or replaces the service's photo, deleting the old photo's files    |
| `DELETE` | `/photo` | none             | Removes the photo and its files; 404 `notFound` if the service has none |

Both return the updated `Service`, like `updateService`, so the frontend can update the menu query (`merchantServiceKeys` in `src/features/merchant/api/service-queries.ts`) the way `useSaveServiceMutation` does. 404 for a service that isn't in this business's menu, matching `serviceNotFound()`. Same limits as shop photos: `photoRules.maxBytes` and content-sniffed type, with `photoMessages.noFile`, `notAPhoto` and `tooLarge` as 422s.

Implementation follows `server/app/services/business_photos.ts`: resize with `toWebpCopies`, write with `putFile` before the row commits inside the existing `withMenu` transaction, clean up the new files if the transaction fails, delete the old files with `deleteUploaded` after a successful replace or remove (a failed delete is logged, never surfaced). The controller wraps the handler like `withUpload` in `merchant_photos_controller.ts` so the body parser's temp file is removed whatever the outcome. Seeded photos (`{ url }`, no `storageKey`) must be replaceable and removable without trying to delete files that aren't in storage.

Frontend: `MerchantServicesService` gains `setServicePhoto(businessId, serviceId, file)` and `removeServicePhoto(businessId, serviceId)`; the HTTP version sends `FormData` through the existing `apiClient` path. Two mutation hooks in `service-queries.ts` update the cached menu entry on success and show the error toast on failure, like the business photo hooks.

## Tests

Follow existing patterns:

- **Server functional:** a new `server/tests/functional/merchant_service_photos.spec.ts`. Set a photo (WebP copies exist, public shop JSON shows `url` and `srcSet`, no `storageKey`), replace deletes the old copies, remove deletes copies and clears the column, remove with no photo is 404, not a photo and too large are 422, no file is 422, non-member is 403, a service from another business is 404, a seeded `{ url }` photo can be replaced and removed, and deleting the service deletes its files. Reuse the fixture and `removeTestUploads` helpers from `merchant_photos.spec.ts` and `server/tests/helpers.ts`.
- **Frontend unit:** the photo spot in `ServiceForm` (add, replace, remove with confirm, error message, no spot on the Add page, no spot in `simple` mode, saving the form doesn't touch the photo), the mock service methods, and the three render sites passing `srcSet` through while keeping `alt=""`.
- **Existing tests** that build a `Service` with `photoUrl` move to `photo`.
- **e2e:** if the merchant journey in `e2e/app.spec.ts` edits a service, add an upload there with the same fixture approach the onboarding journey uses for the cover. Otherwise leave e2e alone; the unit and functional coverage above is enough.

## Left to the builder

- Exact look of the tile and buttons, within `DESIGN.md` and the existing form components. Square thumbnails are allowed by `DESIGN.md`.
- Whether to extract the upload button, busy state and error line from `PhotosPanel.tsx` into a shared piece, or keep two small copies. Either is fine; don't let the extraction grow the scope.
- The storage key layout under the uploads root.
- Whether `toPublicPhoto` is generalised or a sibling helper is added for services.
- Whether the mock resize keeps 1280 px or picks a smaller width for a single service photo.
