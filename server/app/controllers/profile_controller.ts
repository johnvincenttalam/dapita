import type { HttpContext } from '@adonisjs/core/http'
import { formBody } from '#helpers/validate'
import {
  getMyProfile,
  listMyConsents,
  requestAccountDeletion,
  updateMyProfile,
} from '#services/profile'

/** The signed-in user's own account (CUS-06). */
export default class ProfileController {
  async show({ auth }: HttpContext) {
    return getMyProfile(auth.getUserOrFail())
  }

  async update({ auth, request }: HttpContext) {
    return updateMyProfile(auth.getUserOrFail(), formBody(request))
  }

  async consents({ auth }: HttpContext) {
    return listMyConsents(auth.getUserOrFail())
  }

  async requestDeletion({ auth }: HttpContext) {
    return requestAccountDeletion(auth.getUserOrFail())
  }
}
