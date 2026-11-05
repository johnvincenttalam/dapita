import type { MultipartFile } from '@adonisjs/core/bodyparser'
import ApiError from '#exceptions/api_error'
import { toWebpCopies } from '#services/photo_images'
import { deleteUploaded, putFile } from '#services/photo_storage'
import { photoMessages, photoRules } from '#shared/domain'

/**
 * Checks the uploaded file and writes its WebP copies as `<storageKey>-<width>.webp`.
 * If a write fails, the copies already written are deleted before the error is rethrown.
 */
export async function storeWebpCopies(storageKey: string, file: MultipartFile | null) {
  if (!file?.tmpPath) throw new ApiError(photoMessages.noFile, 422)
  if (file.size > photoRules.maxBytes) throw new ApiError(photoMessages.tooLarge, 422)
  const copies = await toWebpCopies(file.tmpPath)
  try {
    await Promise.all(
      photoRules.widths.map((width) => putFile(`${storageKey}-${width}.webp`, copies[width]))
    )
  } catch (error) {
    await deleteUploaded([storageKey])
    throw error
  }
}
