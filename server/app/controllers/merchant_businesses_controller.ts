import type { HttpContext } from '@adonisjs/core/http'
import { formBody } from '#helpers/validate'
import { requireMember } from '#services/accounts'
import {
  addClosure,
  deleteClosure,
  getBusinessProfile,
  submitForReview,
  updateHours,
  updatePolicies,
  updateProfile,
} from '#services/businesses'
import { getNotificationSettings, updateNotificationSettings } from '#services/merchant_settings'
import { notificationSettingsValidator } from '#validators/merchant'

/** The owner's listing and settings (MER-01, MER-03). Members of the business only. */
export default class MerchantBusinessesController {
  async show({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return getBusinessProfile(params.businessId)
  }

  async update({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return updateProfile(params.businessId, formBody(request))
  }

  async updateHours({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return updateHours(params.businessId, formBody(request))
  }

  async addClosure({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return addClosure(params.businessId, formBody(request))
  }

  async deleteClosure({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return deleteClosure(params.businessId, params.closureId)
  }

  async updatePolicies({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return updatePolicies(params.businessId, formBody(request))
  }

  async submit({ auth, params }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    return submitForReview(params.businessId)
  }

  async notificationSettings({ auth, params }: HttpContext) {
    return getNotificationSettings(auth.getUserOrFail(), params.businessId)
  }

  async updateNotificationSettings({ auth, params, request }: HttpContext) {
    const settings = await request.validateUsing(notificationSettingsValidator)
    return updateNotificationSettings(auth.getUserOrFail(), params.businessId, settings)
  }
}
