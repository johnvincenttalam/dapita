import { photoMessages } from '@/config/photos'
import { ApiError } from '@/lib/api-client'
import { photoFileProblem } from '@/lib/photos'
import { resizeImageToDataUrl } from '@/lib/resize-image'

export function checkPhotoFile(file: File | undefined): asserts file is File {
  if (!file) throw new ApiError(photoMessages.noFile, 422)
  const problem = photoFileProblem(file)
  if (problem) throw new ApiError(problem, 422)
}

/** The resized photo, or `notAPhoto` when the browser can't decode it (a text file named `menu.jpg`), like the server. */
export async function resizedPhoto(file: File) {
  try {
    return await resizeImageToDataUrl(file)
  } catch {
    throw new ApiError(photoMessages.notAPhoto, 422)
  }
}
