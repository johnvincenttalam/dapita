# Shop photos: owners upload a cover and a gallery

Date: 2026-10-30
Status: reviewed, awaiting approval

## Why

The marketplace shows a cover photo on every shop card and at the top of each shop page, and the shop page shows up to four gallery photos. Only the seeded demo shops have photos, and those are static files in `public/images/shops/` that the seed attaches. A business that signs up gets `photos: []` (`server/app/controllers/auth_controller.ts:113`), and no screen or API lets an owner add, replace or remove a photo. So every real shop shows the fallback image, which makes the marketplace look empty and untrustworthy.

The data model already supports this. `Business.photos` is a JSON column of `BusinessPhoto { id, url, srcSet?, alt, kind: 'cover' | 'gallery' }` (`src/types/business.ts:30`). What's missing is the upload path, storage, and the owner UI.

## Goals

- An owner can upload, replace and see their shop's **cover photo**.
- An owner can add up to **8 gallery photos**, remove any of them, and reorder them. The order decides which 4 the shop page shows.
- A shop **can't be submitted for review without a cover photo**.
- New owners meet photos during setup, so the requirement doesn't surprise them at the Review step.
- Photos load quickly on phones. Cards and lists use small copies, and the shop page uses a larger one.

## Non-goals

- Photos on individual services (`Service.photoUrl` stays seed-only).
- Multiple shops per owner. The app stays at one business per owner, read from `user.memberships[0]` / `useCurrentBusinessId()`.
- Cropping, filters or editing in the browser.
- Cloud storage now. Local disk only, behind an interface that a cloud driver can implement later.
- Re-reviewing approved shops when their photos change.

## Anti-goals (would count as failure even if it works)

- An approved shop ends up with no cover photo.
- Owners have to press a separate Save button after uploading. The upload itself is the save.
- Full-size phone photos (multi-MB) served to marketplace cards.
- Mock mode (`VITE_USE_MOCKS`, the default) breaks or can't demo the feature.

## Decisions made with the user

1. **Placement:** a new **Photos** tab on Business profile (`src/routes/MerchantProfilePage.tsx`), between **Details** and **Hours**, at `/business/profile?tab=photos`. The cover sits at the top, with the gallery grid below and an "add" tile.
2. **Cover required to submit.** The listing checklist (`src/lib/listing-checklist.ts`, shared with the server via `#shared/domain`) gets a cover-photo item. Both the review screen and the server's `submitForReview` enforce it through the same function.
   - _(Our call, extending this):_ **approve** and **reinstate** in admin moderation (`moderateMerchant` in `server/app/services/admin_merchants.ts`, and the mock in `src/services/admin.service.ts`) also refuse a shop with no cover, with a 422 message: "This shop needs a cover photo before it can go live." On `AdminMerchantReviewPage`, the Approve and Reinstate buttons are disabled when there's no cover, with a short note explaining why. Otherwise listings already pending without a cover (such as the seeded `kulot-studio`) could still go live with no cover.
3. **Approved shops:** photo changes go live immediately, like every other profile edit today.
4. **One shop per owner** stays.

## Behaviour

### Photos tab (owner)

- **Cover:** one per shop. With no cover, it shows an empty drop zone ("Add a cover photo, the first thing customers see") and a note that it's required to submit. With a cover, it shows the image and a **Replace** button. The owner can't remove the cover outright, only replace it.
- **Gallery:** a grid of up to 8 tiles plus an "add" tile while under the limit. Owners can pick several files at once, and only the first files that fit under the cap are accepted (with a message saying how many were skipped). Each tile has a remove action that opens a small confirm dialog ("Remove this photo?"), using the project's existing `alert-dialog`. Confirming deletes it on the server straight away. There's no undo. _(Our call: an undo would need either a delayed delete or a server-side restore, and that's more contract than this is worth.)_ Owners can reorder by drag, with keyboard-accessible move-earlier/move-later controls as well. A small note says the first 4 appear on the shop page.
- **Uploading state:** each file shows its own progress or spinner tile. A failure shows on that tile with the server's message and a retry action. Other uploads carry on.
- **Accepted files:** JPEG, PNG or WebP, up to 10 MB each. Anything else is rejected in the browser before upload with a plain message, and again by the server.
- **Alt text:** generated automatically, with no field for the owner. Cover: `"<Shop name>"`. Gallery: `"<Shop name>, photo <n>"`. Renaming the shop doesn't need to rewrite existing alt text.
- **Who can edit:** anyone who passes `requireMember`, the same as the other profile tabs.

### Setup wizard (new owners)

`src/routes/MerchantOnboardingPage.tsx` steps become **Details → Photos → Hours → Services → Booking rules → Review**. The Photos step reuses the same component as the tab. Its Continue button is enabled once a cover exists, and the gallery is optional. `OnboardingStep` gains `'photos'`, and the Review step lists "Cover photo" with a link back to the Photos step when it's missing.

### Admin review

`src/routes/AdminMerchantReviewPage.tsx` currently shows no photos. Add the cover and the gallery thumbnails so the reviewer can see what will go live. _(Builder's call on exact layout; this was not discussed with the user but follows from the cover being required.)_

### Customer side

No behaviour change. `ShopCard`, `ShopListItem`, `ShopPage`, `BookingCard` and `ConversationList` already read `photos` / `coverPhoto` / `coverPhotoUrl`, and they pick up uploaded photos automatically. Gallery order on the shop page is the stored array order.

## Server

### Storage

- Files go on local disk under `server/storage/uploads/businesses/<businessId>/` (gitignored), behind a small storage module with `put(key, buffer)`, `delete(key)` and `urlFor(key)`. A cloud driver can replace it later without touching callers.
- Each uploaded photo's entry in the `photos` JSON stores its storage key (for example, an added `storageKey` field, server-side only). `url` and `srcSet` are **built when the business is serialized** (`toBusinessData` and the shop serializers in `server/app/services/shops.ts`), from a configured public base, `UPLOADS_PUBLIC_URL`, which defaults to `/api/uploads`. That way, moving the API or the files to another origin later is a config change, not a data migration. Photos without a `storageKey` (the seeded `/images/...` ones) pass through unchanged. `storageKey` isn't sent to clients. _(Our call.)_
- Files are served by the API at **`/api/uploads/...`** so they pass through the existing Vite `/api` proxy in dev and need no extra host config. They're publicly readable, since shop photos are public anyway. Send long-lived cache headers, and give every upload a fresh filename so caches never serve a stale image. Guard against path traversal.
- `server/README.md` "Before a real deployment" gets a line noting that local disk storage doesn't survive redeploys on most hosts and needs a persistent volume or a cloud driver.

### Image processing

- Add `sharp` to the server. On upload: check the real file type from the content, not the extension. Auto-rotate from EXIF, strip metadata, then write WebP copies at **1280, 640 and 320 px wide** (never upscaling), matching the seed's `srcSet` convention in `src/services/mock/seed/businesses.ts:29`.
- The stored `BusinessPhoto.url` is the 1280 copy and `srcSet` lists all three, so the existing `ImageWithFallback` usage works unchanged.
- The original upload isn't kept.

### API (under `/api/merchant/businesses/:businessId`, members only)

| Method   | Path               | Body                | Effect                                                                |
| -------- | ------------------ | ------------------- | --------------------------------------------------------------------- |
| `PUT`    | `/photos/cover`    | multipart `file`    | Sets or replaces the cover, deleting the old cover's files            |
| `POST`   | `/photos`          | multipart `file`    | Appends a gallery photo; 422 at 8                                     |
| `DELETE` | `/photos/:photoId` | none                | Removes a gallery photo and its files; 422 if it's the cover          |
| `PUT`    | `/photos/order`    | `{ ids: string[] }` | Reorders the gallery; the ids must be exactly the current gallery ids |

All four return the updated `Business`, like the other merchant endpoints, so the frontend updates the profile query cache the same way (`useBusinessMutation` in `src/features/merchant/api/business-queries.ts`). Errors use `ApiError` with owner-readable messages ("That file isn't a photo. Use JPG, PNG or WebP.", "Photos can be up to 10 MB.", "You can add up to 8 gallery photos."). The multipart body limit in `server/config/bodyparser.ts` (20 MB) already allows 10 MB files. Enforce the 10 MB per-file limit explicitly.

The JSON column is updated inside the existing `change(businessId, …)` transaction pattern in `server/app/services/businesses.ts`. Files are written before the row commits and cleaned up if the transaction fails. Old files are deleted after a successful replace or remove, and a failed delete is logged, not surfaced.

Seeded photos (URLs under `/images/...`, not `/api/uploads/...`) must be replaceable and removable without trying to delete files that aren't in storage.

### Shared checklist

`listingChecklist` adds an item `{ step: 'photos', label: 'Cover photo', missing: 'Add a cover photo.' }` when no photo has `kind === 'cover'`. Server and client both use it, so the server's 422 "Finish these first: …" message picks it up for free.

## Mock mode

The frontend service layer has an HTTP and a mock implementation per service (`src/services/merchant-business.service.ts`). Add the four photo operations to `MerchantBusinessService`. The mock version resizes in the browser (canvas, about 1280 px wide WebP or JPEG at moderate quality) and stores a data URL in the mock DB, with no `srcSet`. It enforces the same limits and messages. _(Builder's call on exact quality and size; the point is that localStorage doesn't fill up after a few photos.)_ `apiClient` currently always JSON-encodes bodies, so it needs a way to send `FormData` without setting `Content-Type`.

## Tests

Follow existing patterns:

- **Server functional tests:** add to `server/tests/functional/merchant_listing.spec.ts` or a new `merchant_photos.spec.ts`. Cover upload, replace, the 8-photo cap, reorder validation, deleting the cover (rejected), non-member access, non-image rejection, submit blocked without a cover, and admin approve/reinstate blocked without a cover (`server/tests/functional/admin.spec.ts`).
- **`listing-checklist.test.ts`:** the new item.
- **Component tests:** the Photos tab and the onboarding step, in mock mode.
- **e2e:** if `e2e/journeys.spec.ts` covers onboarding, update it for the new step.

## Left to the builder

- Exact visual design of the tab, within `DESIGN.md` and the existing profile tab components.
- The drag-and-drop approach. Use a dependency already in the project if there is one, otherwise a small one or native drag events. Keyboard reordering is required either way.
- Whether uploads go one request per file in parallel or in sequence.
- The storage module's file layout and naming beyond "fresh name per upload".
- Whether the seed or `db:reset` needs changes. Demo shops keep their static cover URLs.
