import sharp from 'sharp'
import ApiError from '#exceptions/api_error'
import { photoMessages, photoRules } from '#shared/domain'

type Width = (typeof photoRules.widths)[number]

const notAPhoto = () => new ApiError(photoMessages.notAPhoto, 422)

/**
 * The WebP copies of an uploaded photo, one per width, never wider than the
 * original. The format comes from the file's content, not its name or declared
 * type. Turned upright from its EXIF orientation; sharp drops the metadata (GPS
 * included) unless asked to keep it. The original isn't kept.
 */
export async function toWebpCopies(filePath: string): Promise<Record<Width, Buffer>> {
  const image = sharp(filePath)
  const { format } = await image.metadata().catch(() => {
    throw notAPhoto()
  })
  if (!(photoRules.acceptedTypes as readonly string[]).includes(`image/${format}`)) {
    throw notAPhoto()
  }
  // A file can have a valid header and still fail to decode (truncated, corrupt).
  const copies = await Promise.all(
    photoRules.widths.map((width) =>
      image.clone().rotate().resize({ width, withoutEnlargement: true }).webp().toBuffer()
    )
  ).catch(() => {
    throw notAPhoto()
  })
  return Object.fromEntries(photoRules.widths.map((width, i) => [width, copies[i]])) as Record<
    Width,
    Buffer
  >
}
