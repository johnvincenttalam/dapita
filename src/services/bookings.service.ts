import { bookingRules } from '@/config/booking'
import { ApiError, apiClient } from '@/lib/api-client'
import {
  BookingTransitionError,
  computeRespondBy,
  isAwaitingResponse,
  proposalLeadMinutes,
  transition,
} from '@/lib/booking-status'
import { addMinutes } from '@/lib/datetime'
import { env } from '@/lib/env'
import { isPreferredStartTime } from '@/lib/opening-hours'
import { hasAnyRole } from '@/lib/roles'
import { updateMockDb, type MockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { createMockId, delay } from '@/services/mock/utils'
import type { SessionUser } from '@/types/auth'
import type { Booking, BookingAction, BookingActor, BookingDetails, BookingStatus } from '@/types/booking'
import type { ID, ISODateTime } from '@/types/common'

export interface CreateBookingInput {
  serviceId: ID
  /** `null` = any available staff member. */
  staffId: ID | null
  start: ISODateTime
  phone?: string
  notes?: string
  /** Generated once per booking attempt; resending with the same key returns the original booking. */
  idempotencyKey: string
}

export type MerchantResponse =
  | { action: 'accept' }
  | { action: 'decline'; reason?: string }
  | { action: 'propose_alternative'; start: ISODateTime; message?: string }

export type BookingOutcome = 'complete' | 'mark_no_show'

export interface BusinessBookingsQuery {
  /** Bookings starting at or after this instant. */
  from?: ISODateTime
  /** Bookings starting before this instant. */
  to?: ISODateTime
  status?: BookingStatus
}

export interface BookingsService {
  // Customer
  createBooking: (input: CreateBookingInput) => Promise<BookingDetails>
  listMyBookings: () => Promise<BookingDetails[]>
  getBooking: (id: ID) => Promise<BookingDetails>
  cancelBooking: (id: ID, reason?: string) => Promise<BookingDetails>
  acceptAlternative: (id: ID) => Promise<BookingDetails>
  declineAlternative: (id: ID, reason?: string) => Promise<BookingDetails>
  // Merchant
  listBusinessBookings: (businessId: ID, query?: BusinessBookingsQuery) => Promise<BookingDetails[]>
  getBusinessBooking: (id: ID) => Promise<BookingDetails>
  respondToBooking: (id: ID, response: MerchantResponse) => Promise<BookingDetails>
  /** P1 (BKG-09). */
  recordOutcome: (id: ID, outcome: BookingOutcome) => Promise<BookingDetails>
}

const bookingPath = (id: ID) => `/bookings/${encodeURIComponent(id)}`
const merchantBookingPath = (id: ID) => `/merchant/bookings/${encodeURIComponent(id)}`
const merchantEndpoint: Record<MerchantResponse['action'] | BookingOutcome, string> = {
  accept: 'accept',
  decline: 'decline',
  propose_alternative: 'propose',
  complete: 'complete',
  mark_no_show: 'no-show',
}

// Endpoints from docs/implementation-plan.md §7.3.
const httpBookingsService: BookingsService = {
  createBooking: ({ idempotencyKey, ...input }) =>
    apiClient.post<BookingDetails>('/bookings', input, { headers: { 'Idempotency-Key': idempotencyKey } }),
  listMyBookings: () => apiClient.get<BookingDetails[]>('/me/bookings'),
  getBooking: (id) => apiClient.get<BookingDetails>(bookingPath(id)),
  cancelBooking: (id, reason) => apiClient.post<BookingDetails>(`${bookingPath(id)}/cancel`, { reason }),
  acceptAlternative: (id) => apiClient.post<BookingDetails>(`${bookingPath(id)}/accept-alternative`),
  declineAlternative: (id, reason) =>
    apiClient.post<BookingDetails>(`${bookingPath(id)}/decline-alternative`, { reason }),
  listBusinessBookings: (businessId, query) =>
    apiClient.get<BookingDetails[]>(`/merchant/businesses/${encodeURIComponent(businessId)}/bookings`, {
      query: { ...query },
    }),
  getBusinessBooking: (id) => apiClient.get<BookingDetails>(merchantBookingPath(id)),
  respondToBooking: (id, { action, ...body }) =>
    apiClient.post<BookingDetails>(`${merchantBookingPath(id)}/${merchantEndpoint[action]}`, body),
  recordOutcome: (id, outcome) =>
    apiClient.post<BookingDetails>(`${merchantBookingPath(id)}/${merchantEndpoint[outcome]}`),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Behaves like the documented backend: the session decides who you are, every
// change goes through the state machine and is written to the audit trail, and
// customers and merchants only ever see their own bookings (doc §7.2–7.3).

const notFound = () => new ApiError('We couldn’t find that booking.', 404)

function requireUser() {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  return user
}

const isMember = (user: SessionUser, businessId: ID) =>
  user.memberships.some((membership) => membership.businessId === businessId)

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function createReference() {
  let code = ''
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)]
  return `DP-${code}`
}

interface ApplyOptions {
  actorId: ID | null
  reason?: string
  now: Date
}

/** Runs one action through the state machine and records it. Invalid moves become HTTP 409s. */
function applyAction(db: MockDb, booking: Booking, action: BookingAction, actor: BookingActor, options: ApplyOptions) {
  const from = booking.status
  try {
    booking.status = transition(from, action, actor)
  } catch (error) {
    if (error instanceof BookingTransitionError) {
      throw new ApiError(error.message, 409, { code: 'invalid_transition' })
    }
    throw error
  }
  const at = options.now.toISOString()
  booking.updatedAt = at
  if (!isAwaitingResponse(booking.status)) booking.respondBy = undefined
  const reason = options.reason?.trim() || undefined
  db.bookingEvents.push({
    id: createMockId('bke'),
    bookingId: booking.id,
    action,
    actor,
    actorId: options.actorId,
    from,
    to: booking.status,
    reason,
    at,
  })
}

/** Closes requests whose response deadline has passed, as a scheduled job on the server would. */
function expireOverdue(db: MockDb, now: Date) {
  for (const booking of db.bookings) {
    if (isAwaitingResponse(booking.status) && booking.respondBy && new Date(booking.respondBy) <= now) {
      booking.proposal = undefined
      applyAction(db, booking, 'expire', 'system', { actorId: null, now: new Date(booking.respondBy) })
    }
  }
}

function toDetails(db: MockDb, booking: Booking): BookingDetails {
  const business = db.businesses.find((candidate) => candidate.id === booking.businessId)
  const area = db.areas.find((candidate) => candidate.id === business?.areaId)
  return {
    ...booking,
    business: {
      id: booking.businessId,
      slug: business?.slug ?? '',
      name: business?.name ?? 'Unavailable business',
      address: business?.address ?? '',
      areaName: area?.name ?? '',
      phone: business?.phone,
      coverPhotoUrl: business?.photos.find((photo) => photo.kind === 'cover')?.url,
    },
    staffName: db.staff.find((member) => member.id === booking.staffId)?.displayName,
    events: db.bookingEvents.filter((event) => event.bookingId === booking.id).sort((a, b) => a.at.localeCompare(b.at)),
  }
}

const byStart = (a: Booking, b: Booking) => a.start.localeCompare(b.start)

/** Reads and changes the database in one step, after expiring overdue requests. */
function transact<T>(change: (db: MockDb, now: Date) => T): T {
  const now = new Date()
  return updateMockDb((db) => {
    expireOverdue(db, now)
    return change(db, now)
  })
}

function customerBooking(db: MockDb, user: SessionUser, id: ID) {
  const booking = db.bookings.find((candidate) => candidate.id === id)
  // 404 rather than 403, so ids of other people's bookings aren't confirmed.
  if (!booking || booking.customerId !== user.id) throw notFound()
  return booking
}

function merchantBooking(db: MockDb, user: SessionUser, id: ID) {
  const booking = db.bookings.find((candidate) => candidate.id === id)
  if (!booking || !isMember(user, booking.businessId)) throw notFound()
  return booking
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

const mockBookingsService: BookingsService = {
  async createBooking({ idempotencyKey, ...input }) {
    await delay(700)
    const user = requireUser()
    if (!hasAnyRole(user, ['customer'])) throw new ApiError('Only customer accounts can book.', 403)

    return transact((db, now) => {
      const existingId = db.idempotencyKeys[idempotencyKey]
      const existing = existingId && db.bookings.find((booking) => booking.id === existingId)
      if (existing) return toDetails(db, existing)

      const service = db.services.find((candidate) => candidate.id === input.serviceId && candidate.active)
      const business = db.businesses.find((candidate) => candidate.id === service?.businessId)
      if (!service || !business || business.status !== 'approved') {
        throw new ApiError('This service isn’t available any more.', 404)
      }
      if (input.staffId) {
        const staff = db.staff.find((member) => member.id === input.staffId)
        if (!staff?.active || staff.businessId !== business.id || !staff.serviceIds.includes(service.id)) {
          throw new ApiError('That staff member doesn’t offer this service. Choose someone else.', 422)
        }
      }

      const start = new Date(input.start)
      validateFutureStart(start, now)
      if (!isPreferredStartTime(business.hours, business.closures, start, service.durationMinutes, now)) {
        throw new ApiError('The shop isn’t open for this service at that time. Choose another time.', 422)
      }
      const duplicate = db.bookings.some(
        (booking) =>
          booking.customerId === user.id &&
          booking.serviceId === service.id &&
          booking.start === start.toISOString() &&
          isAwaitingResponse(booking.status),
      )
      if (duplicate) throw new ApiError('You’ve already requested this service at this time.', 409)

      const createdAt = now.toISOString()
      const booking: Booking = {
        id: createMockId('bk'),
        reference: createReference(),
        customerId: user.id,
        contact: { name: user.name, email: user.email, phone: input.phone?.trim() || undefined },
        businessId: business.id,
        serviceId: service.id,
        staffId: input.staffId,
        start: start.toISOString(),
        end: addMinutes(start, service.durationMinutes).toISOString(),
        status: 'draft',
        notes: input.notes?.trim() || undefined,
        bookingMethod: business.bookingMethod,
        service: { name: service.name, durationMinutes: service.durationMinutes, price: service.price },
        policyVersion: business.policies.version,
        createdAt,
        updatedAt: createdAt,
      }
      applyAction(db, booking, 'submit', 'customer', { actorId: user.id, now })
      booking.respondBy = computeRespondBy(now, start)
      db.bookings.push(booking)
      db.idempotencyKeys[idempotencyKey] = booking.id
      return toDetails(db, booking)
    })
  },

  async listMyBookings() {
    await delay(400)
    const user = requireUser()
    return transact((db) =>
      db.bookings
        .filter((booking) => booking.customerId === user.id)
        .sort(byStart)
        .map((booking) => toDetails(db, booking)),
    )
  },

  async getBooking(id) {
    await delay(300)
    const user = requireUser()
    return transact((db) => toDetails(db, customerBooking(db, user, id)))
  },

  async cancelBooking(id, reason) {
    await delay(600)
    const user = requireUser()
    return transact((db, now) => {
      const booking = customerBooking(db, user, id)
      if (new Date(booking.start) <= now) throw new ApiError('This appointment has already started.', 409)
      booking.proposal = undefined
      applyAction(db, booking, 'cancel', 'customer', { actorId: user.id, reason, now })
      return toDetails(db, booking)
    })
  },

  async acceptAlternative(id) {
    await delay(600)
    const user = requireUser()
    return transact((db, now) => {
      const booking = customerBooking(db, user, id)
      const proposal = booking.proposal
      applyAction(db, booking, 'accept_alternative', 'customer', { actorId: user.id, now })
      if (proposal) {
        booking.start = proposal.start
        booking.end = proposal.end
        booking.proposal = undefined
      }
      return toDetails(db, booking)
    })
  },

  async declineAlternative(id, reason) {
    await delay(600)
    const user = requireUser()
    return transact((db, now) => {
      const booking = customerBooking(db, user, id)
      applyAction(db, booking, 'decline_alternative', 'customer', { actorId: user.id, reason, now })
      // The original request goes back to the merchant with a fresh deadline.
      booking.proposal = undefined
      booking.respondBy = computeRespondBy(now, booking.start)
      return toDetails(db, booking)
    })
  },

  async listBusinessBookings(businessId, query = {}) {
    await delay(400)
    const user = requireUser()
    if (!isMember(user, businessId)) throw new ApiError('You don’t have access to this business.', 403)
    return transact((db) =>
      db.bookings
        .filter(
          (booking) =>
            booking.businessId === businessId &&
            booking.status !== 'draft' &&
            (!query.from || booking.start >= new Date(query.from).toISOString()) &&
            (!query.to || booking.start < new Date(query.to).toISOString()) &&
            (!query.status || booking.status === query.status),
        )
        .sort(byStart)
        .map((booking) => toDetails(db, booking)),
    )
  },

  async getBusinessBooking(id) {
    await delay(300)
    const user = requireUser()
    return transact((db) => toDetails(db, merchantBooking(db, user, id)))
  },

  async respondToBooking(id, response) {
    await delay(600)
    const user = requireUser()
    return transact((db, now) => {
      const booking = merchantBooking(db, user, id)
      if (response.action === 'propose_alternative') {
        const start = new Date(response.start)
        validateFutureStart(start, now)
        if (start < addMinutes(now, proposalLeadMinutes)) {
          throw new ApiError('That’s too soon for the customer to answer. Choose a later time.', 422)
        }
        const business = db.businesses.find((candidate) => candidate.id === booking.businessId)
        if (
          !business ||
          !isPreferredStartTime(business.hours, business.closures, start, booking.service.durationMinutes, now)
        ) {
          throw new ApiError('The shop isn’t open for this service at that time. Choose another time.', 422)
        }
        if (start.toISOString() === booking.start) {
          throw new ApiError('Propose a different time from the one requested.', 422)
        }
        applyAction(db, booking, 'propose_alternative', 'merchant', {
          actorId: user.id,
          reason: response.message,
          now,
        })
        booking.proposal = {
          start: start.toISOString(),
          end: addMinutes(start, booking.service.durationMinutes).toISOString(),
          message: response.message?.trim() || undefined,
          proposedAt: now.toISOString(),
        }
        booking.respondBy = computeRespondBy(now, start)
      } else {
        const reason = response.action === 'decline' ? response.reason : undefined
        applyAction(db, booking, response.action, 'merchant', { actorId: user.id, reason, now })
      }
      return toDetails(db, booking)
    })
  },

  async recordOutcome(id, outcome) {
    await delay(500)
    const user = requireUser()
    return transact((db, now) => {
      const booking = merchantBooking(db, user, id)
      if (new Date(booking.start) > now) {
        throw new ApiError('You can record the outcome once the appointment has started.', 422)
      }
      applyAction(db, booking, outcome, 'merchant', { actorId: user.id, now })
      return toDetails(db, booking)
    })
  },
}

export const bookingsService: BookingsService = env.useMocks ? mockBookingsService : httpBookingsService
