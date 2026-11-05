import type { HttpContext } from '@adonisjs/core/http'
import { withUpload } from '#helpers/uploads'
import { requireMember } from '#services/accounts'
import { removeServicePhoto, setServicePhoto } from '#services/service_photos'

/** A service's photo (MER-02). Members of the business only. */
export default class MerchantServicePhotosController {
  async update({ auth, params, request }: HttpContext) {
    return withUpload(request, async (file) => {
      await requireMember(auth.getUserOrFail(), params.businessId)
      return setServicePhoto(params.businessId, params.serviceId, file)
    })
  }

  async destroy({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return removeServicePhoto(params.businessId, params.serviceId)
  }
}
