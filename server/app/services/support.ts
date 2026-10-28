import db from '@adonisjs/lucid/services/db'
import Booking from '#models/booking'
import Business from '#models/business'
import BusinessMembership from '#models/business_membership'
import SupportCase from '#models/support_case'
import type User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { validateWith } from '#helpers/validate'
import { isMember } from '#services/accounts'
import {
  maxOpenSupportRequests,
  supportRequestSchema,
  type ConversationSide,
  type ID,
} from '#shared/domain'

/**
 * Requests from the support page (ADM-03), ported from src/services/support.service.ts.
 * Each one opens a case for staff. A booking must be the sender's own, from either
 * side; a reported listing must be live. Someone with too many requests waiting is
 * asked to wait for answers first.
 */

const bookingNotFound = () => new ApiError('We couldn’t find that booking.', 404)

export async function sendSupportRequest(user: User, input: unknown) {
  const { topic, message, ...about } = validateWith(supportRequestSchema, input)
  const bookingId = topic === 'booking' ? about.bookingId || null : null
  let businessId = topic === 'listing' ? (about.businessId ?? null) : null
  const membership = await BusinessMembership.query().where('userId', user.id).first()
  let side: ConversationSide = membership ? 'business' : 'customer'

  if (bookingId) {
    const booking = await Booking.find(bookingId)
    if (!booking) throw bookingNotFound()
    if (booking.customerId === user.id) side = 'customer'
    else if (await isMember(user, booking.businessId)) side = 'business'
    else throw bookingNotFound()
    businessId = booking.businessId
  } else if (businessId) {
    const business = await Business.find(businessId)
    if (business?.status !== 'approved') throw new ApiError('We couldn’t find that shop.', 404)
    side = 'customer'
  }

  return db.transaction(async (trx) => {
    // Serialises one sender's requests, so two at once can't both slip under the limit.
    await trx.from('users').where('id', user.id).forUpdate().first()
    const waiting = await SupportCase.query({ client: trx })
      .where('reporterId', user.id)
      .whereNot('kind', 'message')
      .whereNot('status', 'resolved')
      .count('* as total')
    if (Number(waiting[0]?.$extras.total) >= maxOpenSupportRequests) {
      throw new ApiError(
        `You have ${maxOpenSupportRequests} requests waiting. We’ll answer those first; add anything new to them by email.`,
        429
      )
    }

    const now = new Date().toISOString()
    const item = await SupportCase.create(
      {
        id: newId('case'),
        kind: topic,
        conversationId: null,
        businessId,
        bookingId,
        reporterId: user.id,
        reporterSide: side,
        status: 'open',
        ownerId: null,
        ownerName: null,
        events: [
          { id: newId('cev'), kind: 'opened', actorName: user.name, text: message, at: now },
        ],
        createdAt: now,
        updatedAt: now,
      },
      { client: trx }
    )
    return { id: item.id as ID, createdAt: item.createdAt }
  })
}
