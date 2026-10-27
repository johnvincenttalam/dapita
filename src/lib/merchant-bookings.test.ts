import { describe, expect, it } from 'vitest'

import { addMinutes, zonedDateTime } from '@/lib/datetime'
import {
  describeClash,
  findClashes,
  formatAnswerBy,
  getMerchantTab,
  groupMerchantBookings,
  msUntilNextExpiry,
  nextPendingId,
} from '@/lib/merchant-bookings'
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
    end: addMinutes(start, 60).toISOString(),
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

describe('getMerchantTab', () => {
  const past = { start: at('2026-10-20', '10:00'), end: at('2026-10-20', '11:00') }

  it('puts open requests under Requests', () => {
    expect(getMerchantTab(make({ status: 'pending' }), NOW)).toBe('requests')
    expect(getMerchantTab(make({ status: 'alternative_proposed' }), NOW)).toBe('requests')
  })

  it('puts future confirmed bookings under Upcoming', () => {
    expect(getMerchantTab(make({ status: 'confirmed' }), NOW)).toBe('upcoming')
  })

  it('moves proposed and confirmed bookings whose time has passed to Past', () => {
    expect(getMerchantTab(make({ status: 'alternative_proposed', ...past }), NOW)).toBe('past')
    expect(getMerchantTab(make({ status: 'confirmed', ...past }), NOW)).toBe('past')
  })

  it('keeps a proposal under Requests until the proposed time, not the original one', () => {
    const proposal = { start: at('2026-10-24', '10:00'), end: at('2026-10-24', '11:00'), proposedAt: NOW.toISOString() }
    const booking = make({ status: 'alternative_proposed', ...past, proposal })
    expect(getMerchantTab(booking, NOW)).toBe('requests')
    expect(getMerchantTab(booking, new Date(at('2026-10-24', '11:30')))).toBe('past')
  })

  it('puts closed bookings under Past', () => {
    for (const status of ['declined', 'expired', 'cancelled', 'completed', 'no_show'] as const) {
      expect(getMerchantTab(make({ status }), NOW)).toBe('past')
    }
  })
})

describe('groupMerchantBookings', () => {
  it('orders requests by deadline, with proposed times after pending ones', () => {
    const proposed = make({ status: 'alternative_proposed', start: at('2026-10-22', '10:00') })
    const late = make({ status: 'pending', respondBy: at('2026-10-22', '09:00') })
    const soon = make({ status: 'pending', respondBy: at('2026-10-21', '13:00') })
    const noDeadline = make({ status: 'pending' })
    const grouped = groupMerchantBookings([proposed, noDeadline, late, soon], NOW)
    expect(grouped.requests.map((b) => b.id)).toEqual([soon.id, late.id, noDeadline.id, proposed.id])
  })

  it('orders proposed requests by the proposed time', () => {
    const proposal = (date: string) => ({
      start: at(date, '10:00'),
      end: at(date, '11:00'),
      proposedAt: NOW.toISOString(),
    })
    const later = make({
      status: 'alternative_proposed',
      start: at('2026-10-22', '10:00'),
      proposal: proposal('2026-10-26'),
    })
    const sooner = make({
      status: 'alternative_proposed',
      start: at('2026-10-23', '10:00'),
      proposal: proposal('2026-10-24'),
    })
    expect(groupMerchantBookings([later, sooner], NOW).requests.map((x) => x.id)).toEqual([sooner.id, later.id])
  })

  it('orders upcoming soonest first and past newest first', () => {
    const a = make({ status: 'confirmed', start: at('2026-10-24', '10:00') })
    const b = make({ status: 'confirmed', start: at('2026-10-22', '10:00') })
    const old = make({ status: 'completed', start: at('2026-10-01', '10:00') })
    const recent = make({ status: 'declined', start: at('2026-10-19', '10:00') })
    const grouped = groupMerchantBookings([a, b, old, recent], NOW)
    expect(grouped.upcoming.map((x) => x.id)).toEqual([b.id, a.id])
    expect(grouped.past.map((x) => x.id)).toEqual([recent.id, old.id])
  })
})

describe('nextPendingId', () => {
  it('returns the next pending request, skipping the answered one and proposed times', () => {
    const answered = make({ status: 'pending', respondBy: at('2026-10-21', '12:00') })
    const proposed = make({ status: 'alternative_proposed' })
    const next = make({ status: 'pending', respondBy: at('2026-10-21', '15:00') })
    const grouped = groupMerchantBookings([answered, proposed, next], NOW)
    expect(nextPendingId(grouped, answered.id)).toBe(next.id)
    expect(nextPendingId(groupMerchantBookings([answered, proposed], NOW), answered.id)).toBeUndefined()
  })
})

describe('findClashes', () => {
  const target = make({ status: 'pending', staffId: 'stf_ken' })
  const start = at('2026-10-23', '14:00')
  const end = at('2026-10-23', '15:00')

  it('finds an overlapping confirmed booking for the same staff member', () => {
    const other = make({ status: 'confirmed', start: at('2026-10-23', '14:30') })
    expect(findClashes(target, start, end, [target, other])).toMatchObject([{ booking: { id: other.id } }])
  })

  it('ignores other staff members’ bookings', () => {
    const other = make({ status: 'confirmed', staffId: 'stf_mark', start: at('2026-10-23', '14:30') })
    expect(findClashes(target, start, end, [other])).toEqual([])
  })

  it('checks every booking when the request is for any staff', () => {
    const anyStaff = make({ status: 'pending', staffId: null })
    const other = make({ status: 'confirmed', staffId: 'stf_mark', start: at('2026-10-23', '14:30') })
    expect(findClashes(anyStaff, start, end, [other])).toHaveLength(1)
  })

  it('touching times are not clashes', () => {
    const after = make({ status: 'confirmed', start: at('2026-10-23', '15:00') })
    const before = make({ status: 'confirmed', start: at('2026-10-23', '13:00') })
    expect(findClashes(target, start, end, [after, before])).toEqual([])
  })

  it('ignores bookings that aren’t confirmed or proposed', () => {
    const others = (['pending', 'cancelled', 'declined', 'expired'] as const).map((status) =>
      make({ status, start: at('2026-10-23', '14:30') }),
    )
    expect(findClashes(target, start, end, others)).toEqual([])
  })

  it('uses the proposed time of a booking waiting on the customer', () => {
    const proposed = make({
      status: 'alternative_proposed',
      start: at('2026-10-23', '10:00'),
      proposal: { start: at('2026-10-23', '14:30'), end: at('2026-10-23', '15:30'), proposedAt: NOW.toISOString() },
    })
    expect(findClashes(target, start, end, [proposed])).toMatchObject([{ start: at('2026-10-23', '14:30') }])
  })

  it('never clashes with itself', () => {
    const self = { ...target, status: 'confirmed' as const }
    expect(findClashes(target, start, end, [self])).toEqual([])
  })
})

describe('describeClash', () => {
  const clash = (time: string, endTime: string, status: BookingStatus = 'confirmed', name = 'John Dela Cruz') => {
    const booking = make({ status, start: at('2026-10-23', time), contact: { name, email: 'x@example.com' } })
    return { booking, start: at('2026-10-23', time), end: at('2026-10-23', endTime) }
  }

  it('names the staff member', () => {
    expect(describeClash([clash('14:00', '15:00')], 'Ken')).toBe(
      'Ken already has a confirmed booking at 2:00–3:00 PM (John Dela Cruz).',
    )
  })

  it('says the shop is busy for any-staff requests', () => {
    expect(describeClash([clash('14:00', '15:00')], undefined)).toBe(
      'The shop already has a confirmed booking at 2:00–3:00 PM (John Dela Cruz).',
    )
  })

  it('keeps both meridiems when the range crosses noon', () => {
    expect(describeClash([clash('11:30', '12:30')], 'Ken')).toBe(
      'Ken already has a confirmed booking at 11:30 AM–12:30 PM (John Dela Cruz).',
    )
  })

  it('calls a booking waiting on the customer a proposed time', () => {
    expect(describeClash([clash('14:00', '15:00', 'alternative_proposed')], 'Ken')).toBe(
      'Ken already has a proposed time at 2:00–3:00 PM (John Dela Cruz).',
    )
  })

  it('lists two clashes and counts the rest', () => {
    const clashes = [
      clash('14:00', '15:00'),
      clash('14:30', '15:00', 'confirmed', 'Mark Rivera'),
      clash('14:45', '15:15', 'confirmed', 'Bea Villanueva'),
    ]
    expect(describeClash(clashes, 'Ken')).toBe(
      'Ken already has a confirmed booking at 2:00–3:00 PM (John Dela Cruz) and a confirmed booking at 2:30–3:00 PM (Mark Rivera) +1 more.',
    )
  })

  it('returns nothing without clashes', () => {
    expect(describeClash([], 'Ken')).toBeUndefined()
  })
})

describe('formatAnswerBy', () => {
  it('counts down the last hour', () => {
    expect(formatAnswerBy(addMinutes(NOW, 45).toISOString(), NOW)).toEqual({
      text: 'Answer within 45 min',
      urgent: true,
    })
  })

  it('names today, tomorrow or the weekday', () => {
    expect(formatAnswerBy(at('2026-10-21', '13:00'), NOW)).toEqual({ text: 'Answer by today, 1:00 PM', urgent: false })
    expect(formatAnswerBy(at('2026-10-22', '09:30'), NOW).text).toBe('Answer by tomorrow, 9:30 AM')
    expect(formatAnswerBy(at('2026-10-23', '16:00'), NOW).text).toBe('Answer by Fri, 4:00 PM')
  })
})

describe('msUntilNextExpiry', () => {
  it('is the time until the soonest open deadline', () => {
    const soon = make({ status: 'pending', respondBy: addMinutes(NOW, 30).toISOString() })
    const later = make({ status: 'alternative_proposed', respondBy: addMinutes(NOW, 90).toISOString() })
    const closed = make({ status: 'declined', respondBy: addMinutes(NOW, 5).toISOString() })
    expect(msUntilNextExpiry([later, soon, closed], NOW)).toBe(30 * 60_000)
  })

  it('is zero for a deadline already passed, and undefined with nothing open', () => {
    expect(msUntilNextExpiry([make({ status: 'pending', respondBy: addMinutes(NOW, -1).toISOString() })], NOW)).toBe(0)
    expect(msUntilNextExpiry([make({ status: 'confirmed' })], NOW)).toBeUndefined()
  })
})
