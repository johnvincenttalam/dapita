import type { HttpContext } from '@adonisjs/core/http'
import { requireRole } from '#services/accounts'
import {
  acceptAlternative,
  cancelBooking,
  createBooking,
  declineAlternative,
  getMyBooking,
  listMyBookings,
} from '#services/bookings'
import { createBookingValidator, reasonValidator } from '#validators/booking'

/** The customer's side of a booking (BKG-01…05). */
export default class BookingsController {
  async store({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    requireRole(user, ['customer'], 'Only customer accounts can book.')
    const input = await request.validateUsing(createBookingValidator)
    return createBooking(user, input, request.header('Idempotency-Key') || undefined)
  }

  async index({ auth }: HttpContext) {
    return listMyBookings(auth.getUserOrFail())
  }

  async show({ auth, params }: HttpContext) {
    return getMyBooking(auth.getUserOrFail(), params.id)
  }

  async cancel({ auth, params, request }: HttpContext) {
    const { reason } = await request.validateUsing(reasonValidator)
    return cancelBooking(auth.getUserOrFail(), params.id, reason)
  }

  async acceptAlternative({ auth, params }: HttpContext) {
    return acceptAlternative(auth.getUserOrFail(), params.id)
  }

  async declineAlternative({ auth, params, request }: HttpContext) {
    const { reason } = await request.validateUsing(reasonValidator)
    return declineAlternative(auth.getUserOrFail(), params.id, reason)
  }
}
