import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Area from '#models/area'
import Booking from '#models/booking'
import BookingEvent from '#models/booking_event'
import Business from '#models/business'
import Service from '#models/service'
import StaffMember from '#models/staff_member'
import type User from '#models/user'
import ApiError from '#exceptions/api_error'
import { bookingReference, newId } from '#helpers/ids'
import { isMember } from '#services/accounts'
import { bookingChanged } from '#services/realtime'
import {
  addMinutes,
  BookingTransitionError,
  bookingRules,
  computeRespondBy,
  isAwaitingResponse,
  isPreferredStartTime,
  proposalLeadMinutes,
  transition,
  type BookingAction,
  type BookingActor,
  type BookingDetails,
  type BookingStatus,
  type ID,
  type ISODateTime,
} from '#shared/domain'

/**
 * The booking lifecycle (doc §7.2–7.3), ported from the mock service in
 * src/services/bookings.service.ts with the same state machine and messages:
 * every change goes through `transition`, is written to the audit trail, and is
 * pushed to both sides over the realtime channels once committed.
 */

export interface CreateBookingInput {
  serviceId: ID
  staffId: ID | null
  start: ISODateTime
  phone?: string
  notes?: string
}

export type MerchantResponse =
  | { action: 'accept' }
  | { action: 'decline'; reason?: string }
  | { action: 'propose_alternative'; start: ISODateTime; message?: string }

export type BookingOutcome = 'complete' | 'mark_no_show'

export interface BusinessBookingsQuery {
  from?: ISODateTime
  to?: ISODateTime
  status?: BookingStatus
}

const notFound = () => new ApiError('We couldn’t find that booking.', 404)
const AWAITING: BookingStatus[] = ['pending', 'alternative_proposed']

interface ApplyOptions {
  actorId: ID | null
  reason?: string
  now: Date
}

/** Runs one action through the state machine, saves it and records it. Invalid moves become 409s. */
async function applyAction(
  trx: TransactionClientContract,
  booking: Booking,
  action: BookingAction,
  actor: BookingActor,
  options: ApplyOptions
) {
  const from = booking.status
  try {
    booking.status = transition(from, action, actor)
  } catch (error) {
    if (error instanceof BookingTransitionError) {
      throw new ApiError(error.message, 409, 'invalid_transition')
    }
    throw error
  }
  const at = options.now.toISOString()
  booking.updatedAt = at
  if (!isAwaitingResponse(booking.status)) booking.respondBy = null
  await booking.useTransaction(trx).save()
  await BookingEvent.create(
    {
      id: newId('bke'),
      bookingId: booking.id,
      action,
      actor,
      actorId: options.actorId,
      from,
      to: booking.status,
      reason: options.reason?.trim() || null,
      at,
    },
    { client: trx }
  )
}

/**
 * Closes requests whose response deadline has passed. Runs before every booking
 * read and on a timer (start/scheduler.ts), so both sides hear about it live.
 */
export async function expireOverdue(now = new Date()) {
  const overdue = await Booking.query()
    .whereIn('status', AWAITING)
    .whereNotNull('respondBy')
    .where('respondBy', '<=', now.toISOString())
  for (const booking of overdue) {
    await db.transaction(async (trx) => {
      const deadline = new Date(booking.respondBy!)
      booking.proposal = null
      await applyAction(trx, booking, 'expire', 'system', { actorId: null, now: deadline })
    })
    bookingChanged(booking)
  }
  return overdue.length
}

/** Adds what each screen needs (shop, staff name, audit trail), loading related rows in batches. */
export async function toDetails(bookings: Booking[]): Promise<BookingDetails[]> {
  if (!bookings.length) return []
  const ids = bookings.map((booking) => booking.id)
  const [businesses, staff, events] = await Promise.all([
    Business.query().whereIn('id', [...new Set(bookings.map((booking) => booking.businessId))]),
    StaffMember.query().whereIn(
      'id',
      bookings.flatMap((booking) => (booking.staffId ? [booking.staffId] : []))
    ),
    BookingEvent.query().whereIn('bookingId', ids).orderBy('at', 'asc'),
  ])
  const areas = await Area.query().whereIn(
    'id',
    businesses.map((business) => business.areaId)
  )

  return bookings.map((booking) => {
    const business = businesses.find((candidate) => candidate.id === booking.businessId)
    const area = areas.find((candidate) => candidate.id === business?.areaId)
    return {
      id: booking.id,
      reference: booking.reference,
      customerId: booking.customerId,
      contact: booking.contact,
      businessId: booking.businessId,
      serviceId: booking.serviceId,
      staffId: booking.staffId,
      start: booking.start,
      end: booking.end,
      proposal: booking.proposal ?? undefined,
      status: booking.status,
      notes: booking.notes ?? undefined,
      bookingMethod: booking.bookingMethod,
      service: booking.service,
      policyVersion: booking.policyVersion,
      respondBy: booking.respondBy ?? undefined,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      business: {
        id: booking.businessId,
        slug: business?.slug ?? '',
        name: business?.name ?? 'Unavailable business',
        address: business?.address ?? '',
        areaName: area?.name ?? '',
        phone: business?.phone ?? undefined,
        coverPhotoUrl: business?.coverPhoto?.url,
      },
      staffName: staff.find((member) => member.id === booking.staffId)?.displayName,
      events: events
        .filter((event) => event.bookingId === booking.id)
        .map((event) => ({
          id: event.id,
          bookingId: event.bookingId,
          action: event.action,
          actor: event.actor,
          actorId: event.actorId,
          from: event.from,
          to: event.to,
          reason: event.reason ?? undefined,
          at: event.at,
        })),
    }
  })
}

async function detailsOf(booking: Booking) {
  const [details] = await toDetails([booking])
  return details
}

function validateFutureStart(start: Date, now: Date) {
  if (Number.isNaN(start.getTime())) throw new ApiError('Choose a valid date and time.', 422)
  if (start < addMinutes(now, bookingRules.minLeadTimeMinutes)) {
    throw new ApiError('That time is too soon. Choose a later time.', 422)
  }
  if (start > addMinutes(now, bookingRules.bookingWindowDays * 24 * 60)) {
    throw new ApiError(`You can book up to ${bookingRules.bookingWindowDays} days ahead.`, 422)
  }
}

// 404 rather than 403 for someone else's booking, so its id isn't confirmed.
async function customerBooking(user: User, id: ID, trx?: TransactionClientContract) {
  const booking = await Booking.find(id, { client: trx })
  if (!booking || booking.customerId !== user.id) throw notFound()
  return booking
}

async function merchantBooking(user: User, id: ID, trx?: TransactionClientContract) {
  const booking = await Booking.find(id, { client: trx })
  if (!booking || !(await isMember(user, booking.businessId, trx))) throw notFound()
  return booking
}

/** Runs a change in a transaction, then tells both sides about it. */
async function change(run: (trx: TransactionClientContract, now: Date) => Promise<Booking>) {
  await expireOverdue()
  const booking = await db.transaction((trx) => run(trx, new Date()))
  bookingChanged(booking)
  return detailsOf(booking)
}

// ─── Customer ────────────────────────────────────────────────────────────────

export async function createBooking(
  user: User,
  input: CreateBookingInput,
  idempotencyKey?: string
) {
  if (idempotencyKey) {
    const existing = await Booking.query().where({ customerId: user.id, idempotencyKey }).first()
    if (existing) return detailsOf(existing)
  }

  return change(async (trx, now) => {
    const service = await Service.query({ client: trx })
      .where({ id: input.serviceId, active: true })
      .first()
    const business = service && (await Business.find(service.businessId, { client: trx }))
    if (!service || !business || business.status !== 'approved') {
      throw new ApiError('This service isn’t available any more.', 404)
    }
    if (await isMember(user, business.id, trx)) {
      throw new ApiError('You can’t book your own business.', 422)
    }
    if (input.staffId) {
      const staff = await StaffMember.find(input.staffId, { client: trx })
      if (
        !staff?.active ||
        staff.businessId !== business.id ||
        !staff.serviceIds.includes(service.id)
      ) {
        throw new ApiError(
          'That staff member doesn’t offer this service. Choose someone else.',
          422
        )
      }
    }

    const start = new Date(input.start)
    validateFutureStart(start, now)
    if (
      !isPreferredStartTime(business.hours, business.closures, start, service.durationMinutes, now)
    ) {
      throw new ApiError(
        'The shop isn’t open for this service at that time. Choose another time.',
        422
      )
    }
    const duplicate = await Booking.query({ client: trx })
      .where({ customerId: user.id, serviceId: service.id, start: start.toISOString() })
      .whereIn('status', AWAITING)
      .first()
    if (duplicate) throw new ApiError('You’ve already requested this service at this time.', 409)

    const createdAt = now.toISOString()
    const booking = new Booking().fill({
      id: newId('bk'),
      reference: bookingReference(),
      customerId: user.id,
      contact: { name: user.name, email: user.email, phone: input.phone || undefined },
      businessId: business.id,
      serviceId: service.id,
      staffId: input.staffId,
      start: start.toISOString(),
      end: addMinutes(start, service.durationMinutes).toISOString(),
      proposal: null,
      status: 'draft',
      notes: input.notes || null,
      bookingMethod: business.bookingMethod,
      service: {
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
      },
      policyVersion: business.policies.version,
      respondBy: computeRespondBy(now, start),
      idempotencyKey: idempotencyKey ?? null,
      createdAt,
      updatedAt: createdAt,
    })
    await applyAction(trx, booking, 'submit', 'customer', { actorId: user.id, now })
    return booking
  })
}

export async function listMyBookings(user: User) {
  await expireOverdue()
  const bookings = await Booking.query().where('customerId', user.id).orderBy('start', 'asc')
  return toDetails(bookings)
}

export async function getMyBooking(user: User, id: ID) {
  await expireOverdue()
  return detailsOf(await customerBooking(user, id))
}

export function cancelBooking(user: User, id: ID, reason?: string) {
  return change(async (trx, now) => {
    const booking = await customerBooking(user, id, trx)
    if (new Date(booking.start) <= now)
      throw new ApiError('This appointment has already started.', 409)
    booking.proposal = null
    await applyAction(trx, booking, 'cancel', 'customer', { actorId: user.id, reason, now })
    return booking
  })
}

export function acceptAlternative(user: User, id: ID) {
  return change(async (trx, now) => {
    const booking = await customerBooking(user, id, trx)
    const proposal = booking.proposal
    if (proposal) {
      booking.start = proposal.start
      booking.end = proposal.end
      booking.proposal = null
    }
    await applyAction(trx, booking, 'accept_alternative', 'customer', { actorId: user.id, now })
    return booking
  })
}

export function declineAlternative(user: User, id: ID, reason?: string) {
  return change(async (trx, now) => {
    const booking = await customerBooking(user, id, trx)
    // The original request goes back to the merchant with a fresh deadline.
    booking.proposal = null
    booking.respondBy = computeRespondBy(now, booking.start)
    await applyAction(trx, booking, 'decline_alternative', 'customer', {
      actorId: user.id,
      reason,
      now,
    })
    return booking
  })
}

// ─── Merchant ────────────────────────────────────────────────────────────────

export async function listBusinessBookings(businessId: ID, query: BusinessBookingsQuery) {
  await expireOverdue()
  const bookings = await Booking.query()
    .where('businessId', businessId)
    .whereNot('status', 'draft')
    .if(query.from, (q) => q.where('start', '>=', new Date(query.from!).toISOString()))
    .if(query.to, (q) => q.where('start', '<', new Date(query.to!).toISOString()))
    .if(query.status, (q) => q.where('status', query.status!))
    .orderBy('start', 'asc')
  return toDetails(bookings)
}

export async function getBusinessBooking(user: User, id: ID) {
  await expireOverdue()
  return detailsOf(await merchantBooking(user, id))
}

export function respondToBooking(user: User, id: ID, response: MerchantResponse) {
  return change(async (trx, now) => {
    const booking = await merchantBooking(user, id, trx)
    if (response.action !== 'propose_alternative') {
      const reason = response.action === 'decline' ? response.reason : undefined
      await applyAction(trx, booking, response.action, 'merchant', {
        actorId: user.id,
        reason,
        now,
      })
      return booking
    }

    const start = new Date(response.start)
    validateFutureStart(start, now)
    if (start < addMinutes(now, proposalLeadMinutes)) {
      throw new ApiError('That’s too soon for the customer to answer. Choose a later time.', 422)
    }
    const business = await Business.find(booking.businessId, { client: trx })
    if (
      !business ||
      !isPreferredStartTime(
        business.hours,
        business.closures,
        start,
        booking.service.durationMinutes,
        now
      )
    ) {
      throw new ApiError(
        'The shop isn’t open for this service at that time. Choose another time.',
        422
      )
    }
    if (start.toISOString() === booking.start) {
      throw new ApiError('Propose a different time from the one requested.', 422)
    }
    booking.proposal = {
      start: start.toISOString(),
      end: addMinutes(start, booking.service.durationMinutes).toISOString(),
      message: response.message?.trim() || undefined,
      proposedAt: now.toISOString(),
    }
    booking.respondBy = computeRespondBy(now, start)
    await applyAction(trx, booking, 'propose_alternative', 'merchant', {
      actorId: user.id,
      reason: response.message,
      now,
    })
    return booking
  })
}

export function recordOutcome(user: User, id: ID, outcome: BookingOutcome) {
  return change(async (trx, now) => {
    const booking = await merchantBooking(user, id, trx)
    if (new Date(booking.start) > now) {
      throw new ApiError('You can record the outcome once the appointment has started.', 422)
    }
    await applyAction(trx, booking, outcome, 'merchant', { actorId: user.id, now })
    return booking
  })
}
