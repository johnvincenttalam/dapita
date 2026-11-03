import { rm } from 'node:fs/promises'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { HttpContext } from '@adonisjs/core/http'
import { formBody } from '#helpers/validate'
import { requireMember } from '#services/accounts'
import { addGalleryPhoto, removePhoto, reorderGallery, setCover } from '#services/business_photos'

/**
 * Runs `handle` with the request's `file` part, then deletes the original the
 * body parser streamed to the OS temp folder, whatever the outcome: only the
 * WebP copies are kept.
 */
async function withUpload<T>(
  request: HttpContext['request'],
  handle: (file: MultipartFile | null) => Promise<T>
) {
  const file = request.file('file')
  try {
    return await handle(file)
  } finally {
    if (file?.tmpPath) await rm(file.tmpPath, { force: true })
  }
}

/** The shop's cover and gallery photos (MER-01). Members of the business only. */
export default class MerchantPhotosController {
  async setCover({ auth, params, request }: HttpContext) {
    return withUpload(request, async (file) => {
      await requireMember(auth.getUserOrFail(), params.businessId)
      return setCover(params.businessId, file)
    })
  }

  async store({ auth, params, request }: HttpContext) {
    return withUpload(request, async (file) => {
      await requireMember(auth.getUserOrFail(), params.businessId)
      return addGalleryPhoto(params.businessId, file)
    })
  }

  async destroy({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return removePhoto(params.businessId, params.photoId)
  }

  async reorder({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return reorderGallery(params.businessId, formBody(request))
  }
}
