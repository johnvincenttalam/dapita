import env from '#start/env'
import { photoRules, type BusinessPhoto, type ServicePhoto } from '#shared/domain'

/**
 * A photo as the `photos` column keeps it. Uploaded photos store only where their
 * files are; seeded photos (static `/images/...` URLs) keep their URLs as they are.
 */
export type StoredPhoto = BusinessPhoto | UploadedPhoto

type UploadedPhoto = Omit<BusinessPhoto, 'url' | 'srcSet'> & {
  /** e.g. `businesses/biz_x/ph_y`; the files are `<storageKey>-<width>.webp`. Never sent to clients. */
  storageKey: string
}

export function isUploaded(photo: StoredPhoto): photo is UploadedPhoto {
  return 'storageKey' in photo
}

/**
 * The photo as clients see it. URLs are built here, not stored, so serving the
 * files from another origin later is a change to `UPLOADS_PUBLIC_URL`, not to the data.
 */
export function toPublicPhoto(photo: StoredPhoto): BusinessPhoto {
  if (!isUploaded(photo)) return photo
  const { storageKey, ...rest } = photo
  return { ...rest, ...publicUrls(storageKey) }
}

/** A service's photo as stored: seeded `{ url }`, or an uploaded file's storage key. */
export type StoredServicePhoto = ServicePhoto | { storageKey: string }

export function isUploadedServicePhoto(photo: StoredServicePhoto): photo is { storageKey: string } {
  return 'storageKey' in photo
}

export function toPublicServicePhoto(photo: StoredServicePhoto): ServicePhoto {
  return isUploadedServicePhoto(photo) ? publicUrls(photo.storageKey) : photo
}

function publicUrls(storageKey: string): { url: string; srcSet: string } {
  const base = (env.get('UPLOADS_PUBLIC_URL') ?? '/api/uploads').replace(/\/+$/, '')
  const urlAt = (width: number) => `${base}/${storageKey}-${width}.webp`
  return {
    url: urlAt(1280),
    srcSet: photoRules.widths.map((width) => `${urlAt(width)} ${width}w`).join(', '),
  }
}
