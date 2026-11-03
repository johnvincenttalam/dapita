import env from '#start/env'
import { photoRules, type BusinessPhoto } from '#shared/domain'

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
  const base = (env.get('UPLOADS_PUBLIC_URL') ?? '/api/uploads').replace(/\/+$/, '')
  const urlAt = (width: number) => `${base}/${storageKey}-${width}.webp`
  return {
    ...rest,
    url: urlAt(1280),
    srcSet: photoRules.widths.map((width) => `${urlAt(width)} ${width}w`).join(', '),
  }
}
