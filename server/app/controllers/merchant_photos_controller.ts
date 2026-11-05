import type { HttpContext } from '@adonisjs/core/http'
import { withUpload } from '#helpers/uploads'
import { formBody } from '#helpers/validate'
import { requireMember } from '#services/accounts'
import { addGalleryPhoto, removePhoto, reorderGallery, setCover } from '#services/business_photos'

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
