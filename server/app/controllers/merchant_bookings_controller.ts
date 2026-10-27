import type { HttpContext } from '@adonisjs/core/http'
import { requireMember } from '#services/accounts'
import {
  getBusinessBooking,
  listBusinessBookings,
  recordOutcome,
  respondToBooking,
} from '#services/bookings'
import {
  businessBookingsQueryValidator,
  proposeValidator,
  reasonValidator,
} from '#validators/booking'

/** The shop's side of a booking (MER-04, BKG-09). Members of the business only. */
export default class MerchantBookingsController {
  async index({ auth, params, request }: HttpContext) {
    await requireMember(auth.getUserOrFail(), params.businessId)
    const query = await businessBookingsQueryValidator.validate(request.qs())
    return listBusinessBookings(params.businessId, query)
  }

  async show({ auth, params }: HttpContext) {
    return getBusinessBooking(auth.getUserOrFail(), params.id)
  }

  async accept({ auth, params }: HttpContext) {
    return respondToBooking(auth.getUserOrFail(), params.id, { action: 'accept' })
  }

  async decline({ auth, params, request }: HttpContext) {
    const { reason } = await request.validateUsing(reasonValidator)
    return respondToBooking(auth.getUserOrFail(), params.id, { action: 'decline', reason })
  }

  async propose({ auth, params, request }: HttpContext) {
    const { start, message } = await request.validateUsing(proposeValidator)
    return respondToBooking(auth.getUserOrFail(), params.id, {
      action: 'propose_alternative',
      start,
      message,
    })
  }

  async complete({ auth, params }: HttpContext) {
    return recordOutcome(auth.getUserOrFail(), params.id, 'complete')
  }

  async noShow({ auth, params }: HttpContext) {
    return recordOutcome(auth.getUserOrFail(), params.id, 'mark_no_show')
  }
}
