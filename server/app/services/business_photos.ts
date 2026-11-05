import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type Business from '#models/business'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { isUploaded, type StoredPhoto } from '#helpers/photos'
import { change } from '#services/businesses'
import { storeWebpCopies } from '#services/photo_upload'
import { deleteUploaded } from '#services/photo_storage'
import { photoAlt, photoMessages, photoRules, type ID } from '#shared/domain'

/**
 * The shop's cover and gallery. An upload's files are written before the row
 * changes and deleted again if the change fails; a replaced or removed photo's
 * files go once the change is saved. Seeded photos have no files, so nothing is
 * deleted for them. Callers check membership first (`requireMember`).
 */

type Upload = { id: ID; storageKey: string }

/** Checks the file and writes its WebP copies under a fresh key. */
async function store(businessId: ID, file: MultipartFile | null): Promise<Upload> {
  const id = newId('ph')
  const storageKey = `businesses/${businessId}/${id}`
  await storeWebpCopies(storageKey, file)
  return { id, storageKey }
}

/** Applies `edit` under the row lock, then deletes the files of the photos it dropped. */
async function changePhotos(businessId: ID, edit: (business: Business) => StoredPhoto[]) {
  const dropped: StoredPhoto[] = []
  const business = await change(businessId, (locked) => {
    dropped.push(...edit(locked))
  })
  await deleteUploaded(dropped.filter(isUploaded).map((photo) => photo.storageKey))
  return business
}

async function changeWithUpload(
  businessId: ID,
  file: MultipartFile | null,
  edit: (business: Business, upload: Upload) => StoredPhoto[]
) {
  const upload = await store(businessId, file)
  try {
    return await changePhotos(businessId, (business) => edit(business, upload))
  } catch (error) {
    await deleteUploaded([upload.storageKey])
    throw error
  }
}

const galleryOf = (business: Business) =>
  business.photos.filter((photo) => photo.kind === 'gallery')

/** Sets or replaces the cover. It stays first, where the shop page and cards look for it. */
export function setCover(businessId: ID, file: MultipartFile | null) {
  return changeWithUpload(businessId, file, (business, upload) => {
    const replaced = business.photos.filter((photo) => photo.kind === 'cover')
    business.photos = [
      { ...upload, alt: photoAlt(business.name, 'cover'), kind: 'cover' },
      ...galleryOf(business),
    ]
    return replaced
  })
}

/** Appends a gallery photo. The cap is checked under the lock, so two uploads at once can't pass 8. */
export function addGalleryPhoto(businessId: ID, file: MultipartFile | null) {
  return changeWithUpload(businessId, file, (business, upload) => {
    const gallery = galleryOf(business)
    if (gallery.length >= photoRules.maxGalleryPhotos) {
      throw new ApiError(photoMessages.galleryFull, 422)
    }
    business.photos = [
      ...business.photos,
      { ...upload, alt: photoAlt(business.name, 'gallery', gallery.length + 1), kind: 'gallery' },
    ]
    return []
  })
}

/** Removes a gallery photo. The cover can only be replaced, so the shop always keeps one. */
export function removePhoto(businessId: ID, photoId: ID) {
  return changePhotos(businessId, (business) => {
    const photo = business.photos.find((candidate) => candidate.id === photoId)
    if (!photo) throw new ApiError(photoMessages.notFound, 404)
    if (photo.kind === 'cover') throw new ApiError(photoMessages.cantRemoveCover, 422)
    business.photos = business.photos.filter((candidate) => candidate.id !== photoId)
    return [photo]
  })
}

/**
 * Puts the gallery in the order of `ids`, which must be exactly the current
 * gallery: a list from before a photo was added or removed elsewhere is refused
 * rather than applied to the wrong photos.
 */
export function reorderGallery(businessId: ID, input: unknown) {
  const { ids } = (input ?? {}) as { ids?: unknown }
  return changePhotos(businessId, (business) => {
    const gallery = new Map(galleryOf(business).map((photo) => [photo.id, photo]))
    if (
      !Array.isArray(ids) ||
      ids.length !== gallery.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => gallery.has(id))
    ) {
      throw new ApiError(photoMessages.staleOrder, 422)
    }
    business.photos = [
      ...business.photos.filter((photo) => photo.kind === 'cover'),
      ...ids.map((id) => gallery.get(id)!),
    ]
    return []
  })
}
