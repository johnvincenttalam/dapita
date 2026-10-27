import type { HttpContext } from '@adonisjs/core/http'
import { formBody } from '#helpers/validate'
import { requireMember } from '#services/accounts'
import {
  createService,
  deleteService,
  getServiceMenu,
  moveService,
  updateService,
} from '#services/merchant_services'
import { moveServiceValidator } from '#validators/merchant'

/** The shop's service menu (MER-02). Members of the business only. */
export default class MerchantServicesController {
  async index({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return getServiceMenu(params.businessId)
  }

  async store({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return createService(params.businessId, formBody(request))
  }

  async update({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return updateService(params.businessId, params.serviceId, formBody(request))
  }

  async move({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    const { direction } = await request.validateUsing(moveServiceValidator)
    return moveService(params.businessId, params.serviceId, direction)
  }

  async destroy({ auth, params, response }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    await deleteService(params.businessId, params.serviceId)
    return response.noContent()
  }
}
