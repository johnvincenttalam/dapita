import type { HttpContext } from '@adonisjs/core/http'
import { formBody } from '#helpers/validate'
import { sendSupportRequest } from '#services/support'

/** The support page's requests (ADM-03). */
export default class SupportController {
  async store({ auth, request, response }: HttpContext) {
    response.status(201)
    return sendSupportRequest(auth.getUserOrFail(), formBody(request))
  }
}
