import { describe, expect, it } from 'vitest'

import {
  availableActions,
  BookingTransitionError,
  bookingStatusMeta,
  canTransition,
  computeRespondBy,
  getBookingTab,
  isAwaitingResponse,
  isTerminal,
  nextStatuses,
  transition,
} from '@/lib/booking-status'
import type { BookingStatus } from '@/types/booking'

describe('booking state machine', () => {
  // The "Allowed next states" column of doc §7.2.
  const documented: Record<BookingStatus, BookingStatus[]> = {
    draft: ['pending'],
    pending: ['confirmed', 'declined', 'alternative_proposed', 'cancelled', 'expired'],
    alternative_proposed: ['confirmed', 'pending', 'cancelled', 'expired'],
    confirmed: ['completed', 'cancelled', 'no_show'],
    declined: [],
    cancelled: [],
    completed: [],
    no_show: [],
    expired: [],
  }

  it.each(Object.entries(documented))('allows exactly the documented moves from %s', (status, expected) => {
    expect(nextStatuses(status as BookingStatus).sort()).toEqual([...expected].sort())
  })

  it('treats declined, cancelled, completed, no-show and expired as closed', () => {
    const closed = Object.keys(documented).filter((status) => isTerminal(status as BookingStatus))
    expect(closed.sort()).toEqual(['cancelled', 'completed', 'declined', 'expired', 'no_show'])
  })

  it('only lets the customer confirm a proposed alternative', () => {
    expect(transition('alternative_proposed', 'accept_alternative', 'customer')).toBe('confirmed')
    expect(canTransition('alternative_proposed', 'accept_alternative', 'merchant')).toBe(false)
    expect(canTransition('alternative_proposed', 'accept', 'merchant')).toBe(false)
  })

  it('returns a declined proposal to the merchant as pending', () => {
    expect(transition('alternative_proposed', 'decline_alternative', 'customer')).toBe('pending')
  })

  it('only lets the merchant accept, decline or propose on a pending request', () => {
    expect(availableActions('pending', 'merchant')).toEqual(['accept', 'decline', 'propose_alternative'])
    expect(canTransition('pending', 'accept', 'customer')).toBe(false)
    expect(canTransition('confirmed', 'decline', 'merchant')).toBe(false)
  })

  it('lets customers cancel open bookings but merchants only confirmed ones', () => {
    expect(availableActions('pending', 'customer')).toEqual(['cancel'])
    expect(availableActions('alternative_proposed', 'customer')).toEqual([
      'accept_alternative',
      'decline_alternative',
      'cancel',
    ])
    expect(canTransition('pending', 'cancel', 'merchant')).toBe(false)
    expect(availableActions('confirmed', 'merchant')).toEqual(['cancel', 'complete', 'mark_no_show'])
  })

  it('restricts completion and no-show to merchants and admins', () => {
    expect(canTransition('confirmed', 'complete', 'customer')).toBe(false)
    expect(transition('confirmed', 'mark_no_show', 'admin')).toBe('no_show')
  })

  it('reserves expiry for the system', () => {
    expect(transition('pending', 'expire', 'system')).toBe('expired')
    expect(canTransition('pending', 'expire', 'merchant')).toBe(false)
    expect(canTransition('confirmed', 'expire', 'system')).toBe(false)
  })

  it('throws a typed error for a forbidden move', () => {
    expect(() => transition('cancelled', 'accept', 'merchant')).toThrow(BookingTransitionError)
    expect(availableActions('completed', 'customer')).toEqual([])
  })

  it('never labels a request awaiting an answer as confirmed', () => {
    for (const status of ['pending', 'alternative_proposed'] as const) {
      expect(isAwaitingResponse(status)).toBe(true)
      expect(bookingStatusMeta[status].label).not.toMatch(/confirm/i)
      expect(bookingStatusMeta[status].tone).not.toBe('success')
    }
  })
})

describe('getBookingTab', () => {
  const now = new Date('2026-10-21T04:00:00Z')
  const future = '2026-10-22T04:00:00Z'
  const past = '2026-10-20T04:00:00Z'

  it.each([
    ['pending', future, 'upcoming'],
    ['alternative_proposed', future, 'upcoming'],
    ['confirmed', future, 'upcoming'],
    ['confirmed', past, 'past'],
    ['pending', past, 'past'],
    ['completed', past, 'past'],
    ['declined', future, 'past'],
    ['expired', future, 'past'],
    ['no_show', past, 'past'],
    ['cancelled', future, 'cancelled'],
    ['cancelled', past, 'cancelled'],
  ] as const)('puts a %s booking ending %s in %s', (status, end, tab) => {
    expect(getBookingTab({ status, end }, now)).toBe(tab)
  })
})

describe('computeRespondBy', () => {
  it('gives the merchant 24 hours when the appointment is far away', () => {
    expect(computeRespondBy('2026-10-21T00:00:00.000Z', '2026-10-25T00:00:00.000Z')).toBe('2026-10-22T00:00:00.000Z')
  })

  it('closes an hour before a sooner appointment', () => {
    expect(computeRespondBy('2026-10-21T00:00:00.000Z', '2026-10-21T05:00:00.000Z')).toBe('2026-10-21T04:00:00.000Z')
  })

  it('is never earlier than the request itself', () => {
    expect(computeRespondBy('2026-10-21T00:00:00.000Z', '2026-10-21T00:30:00.000Z')).toBe('2026-10-21T00:00:00.000Z')
  })
})
