import { describe, expect, it } from 'vitest'

import { addMinutes, zonedDateTime } from '@/lib/datetime'
import { greetingFor, summarizeDashboard } from '@/lib/merchant-dashboard'
import type { BookingDetails, BookingStatus } from '@/types/booking'

// Wednesday 21 Oct 2026, 11:00 in Manila.
const NOW = new Date('2026-10-21T03:00:00Z')

const at = (date: string, time: string) => zonedDateTime(date, time).toISOString()

let counter = 0
function make(overrides: Partial<BookingDetails> & { status: BookingStatus }): BookingDetails {
  const start = overrides.start ?? at('2026-10-23', '14:00')
  return {
    id: `bk_${++counter}`,
    reference: 'DP-TEST00',
    customerId: 'usr_x',
    contact: { name: 'John Dela Cruz', email: 'john@example.com' },
    businessId: 'biz_good_cut',
    serviceId: 'svc_mens_haircut',
    staffId: 'stf_ken',
    start,
    end: overrides.end ?? addMinutes(start, 60).toISOString(),
    bookingMethod: 'request',
    service: { name: 'Men’s Haircut', durationMinutes: 60, price: { type: 'fixed', amount: 250 } },
    policyVersion: 1,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    business: { id: 'biz_good_cut', slug: 'the-good-cut', name: 'The Good Cut', address: '', areaName: 'Poblacion' },
    events: [],
    ...overrides,
  }
}

describe('summarizeDashboard', () => {
  it('lists pending requests by deadline and counts proposals still open', () => {
    const later = make({ status: 'pending', respondBy: at('2026-10-22', '09:00') })
    const sooner = make({ status: 'pending', respondBy: at('2026-10-21', '12:00') })
    const proposed = make({
      status: 'alternative_proposed',
      proposal: { start: at('2026-10-24', '10:00'), end: at('2026-10-24', '11:00'), proposedAt: NOW.toISOString() },
    })
    const lapsedProposal = make({
      status: 'alternative_proposed',
      start: at('2026-10-20', '10:00'),
      proposal: { start: at('2026-10-20', '15:00'), end: at('2026-10-20', '16:00'), proposedAt: NOW.toISOString() },
    })

    const summary = summarizeDashboard([later, proposed, sooner, lapsedProposal], NOW)

    expect(summary.waiting.map((b) => b.id)).toEqual([sooner.id, later.id])
    expect(summary.proposedCount).toBe(1)
  })

  it('lays out today’s confirmed appointments with what is done, in progress and next', () => {
    const done = make({ status: 'confirmed', start: at('2026-10-21', '09:00'), end: at('2026-10-21', '10:00') })
    const inProgress = make({ status: 'confirmed', start: at('2026-10-21', '10:30'), end: at('2026-10-21', '11:30') })
    const next = make({ status: 'confirmed', start: at('2026-10-21', '13:00') })
    const later = make({ status: 'confirmed', start: at('2026-10-21', '16:00') })
    const tomorrow = make({ status: 'confirmed', start: at('2026-10-22', '10:00') })
    const pendingToday = make({ status: 'pending', start: at('2026-10-21', '15:00') })
    const cancelledToday = make({ status: 'cancelled', start: at('2026-10-21', '14:00') })

    const summary = summarizeDashboard([later, tomorrow, next, pendingToday, done, cancelledToday, inProgress], NOW)

    expect(summary.today.map(({ booking, phase }) => [booking.id, phase])).toEqual([
      [done.id, 'done'],
      [inProgress.id, 'now'],
      [next.id, 'next'],
      [later.id, 'later'],
    ])
  })

  it('keeps completed appointments in today’s list as done', () => {
    const completed = make({ status: 'completed', start: at('2026-10-21', '09:00'), end: at('2026-10-21', '10:00') })
    expect(summarizeDashboard([completed], NOW).today).toEqual([{ booking: completed, phase: 'done' }])
  })

  it('counts confirmed appointments over the next seven days, after today', () => {
    const bookings = [
      make({ status: 'confirmed', start: at('2026-10-21', '16:00') }),
      make({ status: 'confirmed', start: at('2026-10-22', '10:00') }),
      make({ status: 'confirmed', start: at('2026-10-28', '20:00') }),
      make({ status: 'confirmed', start: at('2026-10-29', '09:00') }),
      make({ status: 'pending', start: at('2026-10-23', '10:00') }),
    ]
    expect(summarizeDashboard(bookings, NOW).nextSevenDays).toBe(2)
  })
})

describe('greetingFor', () => {
  it('follows the time of day in Davao', () => {
    expect(greetingFor(new Date(at('2026-10-21', '08:00')))).toBe('Good morning')
    expect(greetingFor(new Date(at('2026-10-21', '12:00')))).toBe('Good afternoon')
    expect(greetingFor(new Date(at('2026-10-21', '18:00')))).toBe('Good evening')
    expect(greetingFor(new Date(at('2026-10-21', '02:00')))).toBe('Good evening')
  })
})
