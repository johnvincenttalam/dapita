import { computeRespondBy, transition } from '@/lib/booking-status'
import { addDays, addMinutes, toDateKey, zonedDateTime } from '@/lib/datetime'
import { mockUsers } from '@/services/mock/users'
import type { Business, Service } from '@/types/business'
import type { Booking, BookingAction, BookingActor, BookingContact, BookingEvent } from '@/types/booking'
import type { ID, TimeOfDay } from '@/types/common'

// MOCK: bookings relative to "now", so the demo always has upcoming, pending and
// past items. Each one is built by replaying actions through the real state
// machine, so the seed can't contain a history the rules wouldn't allow.

interface Customer extends BookingContact {
  id: ID
}

const andrea: Customer = { id: mockUsers.customer.id, name: mockUsers.customer.name, email: mockUsers.customer.email }
const walkIn = (id: string, name: string): Customer => ({ id, name, email: `${id.replace('usr_', '')}@example.com` })
// Customer names on the merchant dashboard come from design screen 12.
const john = walkIn('usr_john', 'John Dela Cruz')
const markR = walkIn('usr_mark', 'Mark Rivera')
const alyssa = walkIn('usr_alyssa', 'Alyssa Santos')
const carlos = walkIn('usr_carlos', 'Carlos Tan')
const bea = walkIn('usr_bea', 'Bea Villanueva')

type Step = [action: BookingAction, actor: BookingActor, reason?: string]

interface BookingSeed {
  id: ID
  reference: string
  customer: Customer
  businessId: ID
  serviceId: ID
  staffId?: ID
  /** Days from today (market time zone) and wall-clock time. */
  day: number
  time: TimeOfDay
  /** How long before now the request was sent. */
  sentHoursAgo: number
  steps: Step[]
  proposal?: { day: number; time: TimeOfDay; message?: string }
  notes?: string
}

const seeds: BookingSeed[] = [
  // The signed-in prototype customer.
  {
    id: 'bk_andrea_pending',
    reference: 'DP-7KQ2PA',
    customer: andrea,
    businessId: 'biz_good_cut',
    serviceId: 'svc_cut_styling',
    staffId: 'stf_ken',
    day: 2,
    time: '14:00',
    sentHoursAgo: 3,
    steps: [['submit', 'customer']],
    notes: 'Shoulder-length hair, would like layers.',
  },
  {
    id: 'bk_andrea_alternative',
    reference: 'DP-3MV8RT',
    customer: andrea,
    businessId: 'biz_serenity',
    serviceId: 'svc_sr_swedish',
    day: 4,
    time: '18:00',
    sentHoursAgo: 20,
    steps: [
      ['submit', 'customer'],
      ['propose_alternative', 'merchant'],
    ],
    proposal: { day: 4, time: '19:30', message: '6:00 PM is fully booked. Could you come at 7:30 PM instead?' },
  },
  {
    id: 'bk_andrea_confirmed',
    reference: 'DP-9DX4LB',
    customer: andrea,
    businessId: 'biz_glow_go',
    serviceId: 'svc_gg_cut',
    staffId: 'stf_lia',
    day: 6,
    time: '11:00',
    sentHoursAgo: 48,
    steps: [
      ['submit', 'customer'],
      ['accept', 'merchant'],
    ],
  },
  {
    id: 'bk_andrea_completed',
    reference: 'DP-2HF6NC',
    customer: andrea,
    businessId: 'biz_polished',
    serviceId: 'svc_pn_gel',
    day: -20,
    time: '15:00',
    sentHoursAgo: 23 * 24,
    steps: [
      ['submit', 'customer'],
      ['accept', 'merchant'],
      ['complete', 'merchant'],
    ],
  },
  {
    id: 'bk_andrea_cancelled',
    reference: 'DP-5TR1WE',
    customer: andrea,
    businessId: 'biz_hilot',
    serviceId: 'svc_hl_hilot',
    day: -5,
    time: '16:00',
    sentHoursAgo: 8 * 24,
    steps: [
      ['submit', 'customer'],
      ['accept', 'merchant'],
      ['cancel', 'customer', 'Schedule conflict at work.'],
    ],
  },
  {
    id: 'bk_andrea_declined',
    reference: 'DP-8PL3YU',
    customer: andrea,
    businessId: 'biz_bloom',
    serviceId: 'svc_bm_event',
    day: -9,
    time: '09:00',
    sentHoursAgo: 12 * 24,
    steps: [
      ['submit', 'customer'],
      ['decline', 'merchant', 'Our artists are booked for a wedding that day.'],
    ],
  },
  {
    id: 'bk_andrea_expired',
    reference: 'DP-4ZK7QM',
    customer: andrea,
    businessId: 'biz_arch_lash',
    serviceId: 'svc_al_shape',
    day: -12,
    time: '13:00',
    sentHoursAgo: 14 * 24,
    steps: [
      ['submit', 'customer'],
      ['expire', 'system'],
    ],
  },

  // The Good Cut Barbershop's day (design screen 12) for the "Business owner" account.
  {
    id: 'bk_gc_john',
    reference: 'DP-1AB2CD',
    customer: john,
    businessId: 'biz_good_cut',
    serviceId: 'svc_mens_haircut',
    staffId: 'stf_ken',
    day: 0,
    time: '10:00',
    sentHoursAgo: 30,
    steps: [
      ['submit', 'customer'],
      ['accept', 'merchant'],
    ],
  },
  {
    id: 'bk_gc_mark',
    reference: 'DP-3EF4GH',
    customer: markR,
    businessId: 'biz_good_cut',
    serviceId: 'svc_hair_beard',
    staffId: 'stf_mark',
    day: 0,
    time: '11:30',
    sentHoursAgo: 26,
    steps: [
      ['submit', 'customer'],
      ['accept', 'merchant'],
    ],
  },
  {
    id: 'bk_gc_alyssa',
    reference: 'DP-5IJ6KL',
    customer: alyssa,
    businessId: 'biz_good_cut',
    serviceId: 'svc_mens_haircut',
    staffId: 'stf_ken',
    day: 0,
    time: '13:30',
    sentHoursAgo: 22,
    steps: [
      ['submit', 'customer'],
      ['accept', 'merchant'],
    ],
    notes: 'Booking for my son, he is 14.',
  },
  {
    id: 'bk_gc_carlos',
    reference: 'DP-7MN8OP',
    customer: carlos,
    businessId: 'biz_good_cut',
    serviceId: 'svc_cut_styling',
    day: 1,
    time: '15:00',
    sentHoursAgo: 2,
    steps: [['submit', 'customer']],
  },
  {
    id: 'bk_gc_bea',
    reference: 'DP-9QR0ST',
    customer: bea,
    businessId: 'biz_good_cut',
    serviceId: 'svc_kids_cut',
    staffId: 'stf_james',
    day: 3,
    time: '10:30',
    sentHoursAgo: 5,
    steps: [['submit', 'customer']],
  },
  {
    id: 'bk_gc_john_past',
    reference: 'DP-2UV3WX',
    customer: john,
    businessId: 'biz_good_cut',
    serviceId: 'svc_hair_beard',
    staffId: 'stf_mark',
    day: -7,
    time: '17:00',
    sentHoursAgo: 9 * 24,
    steps: [
      ['submit', 'customer'],
      ['accept', 'merchant'],
      ['complete', 'merchant'],
    ],
  },
]

/** Actor ids for the audit trail; merchant actions are by the business owner. */
function actorId(actor: BookingActor, customer: Customer, business: Business): ID | null {
  if (actor === 'customer') return customer.id
  if (actor === 'merchant') return business.ownerId
  if (actor === 'admin') return mockUsers.admin.id
  return null
}

/** When a seeded step happened: outcomes after the appointment, expiry at the deadline, the rest spread out before. */
function stepTime(
  action: BookingAction,
  index: number,
  stepCount: number,
  { now, createdAt, start, booking }: { now: Date; createdAt: Date; start: Date; booking: Booking },
) {
  if (action === 'complete' || action === 'mark_no_show') {
    return new Date(Math.min(now.getTime(), addMinutes(booking.end, 60).getTime())).toISOString()
  }
  if (action === 'expire' && booking.respondBy) return booking.respondBy
  const latest = Math.min(now.getTime(), start.getTime())
  const span = Math.max(0, latest - createdAt.getTime())
  return new Date(createdAt.getTime() + (span * index) / Math.max(stepCount, 2)).toISOString()
}

export function createSeedBookings(now: Date, businesses: Business[], services: Service[]) {
  const today = toDateKey(now)
  const bookings: Booking[] = []
  const events: BookingEvent[] = []

  for (const seed of seeds) {
    const business = businesses.find((candidate) => candidate.id === seed.businessId)
    const service = services.find((candidate) => candidate.id === seed.serviceId)
    if (!business || !service) throw new Error(`Invalid booking seed ${seed.id}`)

    const createdAt = addMinutes(now, -seed.sentHoursAgo * 60)
    let start = zonedDateTime(addDays(today, seed.day), seed.time)
    const duration = service.durationMinutes
    const booking: Booking = {
      id: seed.id,
      reference: seed.reference,
      customerId: seed.customer.id,
      contact: { name: seed.customer.name, email: seed.customer.email },
      businessId: business.id,
      serviceId: service.id,
      staffId: seed.staffId ?? null,
      start: start.toISOString(),
      end: addMinutes(start, duration).toISOString(),
      status: 'draft',
      notes: seed.notes,
      bookingMethod: business.bookingMethod,
      service: { name: service.name, durationMinutes: duration, price: service.price },
      policyVersion: business.policies.version,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    }

    seed.steps.forEach(([action, actor, reason], index) => {
      const at = stepTime(action, index, seed.steps.length, { now, createdAt, start, booking })
      const from = booking.status
      booking.status = transition(from, action, actor)
      booking.updatedAt = at

      if (action === 'submit') booking.respondBy = computeRespondBy(at, start)
      if (action === 'propose_alternative' && seed.proposal) {
        const proposedStart = zonedDateTime(addDays(today, seed.proposal.day), seed.proposal.time)
        booking.proposal = {
          start: proposedStart.toISOString(),
          end: addMinutes(proposedStart, duration).toISOString(),
          message: seed.proposal.message,
          proposedAt: at,
        }
        booking.respondBy = computeRespondBy(at, proposedStart)
      }
      if (action === 'accept_alternative' && booking.proposal) {
        start = new Date(booking.proposal.start)
        booking.start = booking.proposal.start
        booking.end = booking.proposal.end
        booking.proposal = undefined
      }
      if (!['pending', 'alternative_proposed'].includes(booking.status)) booking.respondBy = undefined

      events.push({
        id: `${seed.id}_ev${index + 1}`,
        bookingId: seed.id,
        action,
        actor,
        actorId: actorId(actor, seed.customer, business),
        from,
        to: booking.status,
        reason,
        at,
      })
    })

    bookings.push(booking)
  }

  return { bookings, events }
}
