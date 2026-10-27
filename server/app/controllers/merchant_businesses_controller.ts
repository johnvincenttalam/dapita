import type { HttpContext } from '@adonisjs/core/http'
import { requireMember } from '#services/accounts'
import { getBusinessProfile } from '#services/businesses'

export default class MerchantBusinessesController {
  async show({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return getBusinessProfile(params.businessId)
  }
}
