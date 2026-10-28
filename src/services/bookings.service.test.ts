import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { addMinutes, zonedDateTime } from '@/lib/datetime'
import { bookingsService, type CreateBookingInput } from '@/services/bookings.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')

function signInAs(account: MockAccount | null) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  else localStorage.removeItem(MOCK_SESSION_KEY)
}

let keyCounter = 0
const request = (overrides: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
  serviceId: 'svc_mens_haircut',
  staffId: null,
  start: zonedDateTime('2026-10-23', '14:00').toISOString(),
  idempotencyKey: `key-${++keyCounter}`,
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('customer bookings (mock service)', () => {
  it('requires a session', async () => {
    await expect(bookingsService.listMyBookings()).rejects.toMatchObject({ status: 401 })
  })

  it('lists only the signed-in customer’s bookings', async () => {
    signInAs('customer')
    const bookings = await bookingsService.listMyBookings()
    expect(bookings.length).toBeGreaterThan(0)
    expect(bookings.every((booking) => booking.customerId === mockUsers.customer.id)).toBe(true)
    await expect(bookingsService.getBooking('bk_gc_john')).rejects.toMatchObject({ status: 404 })
  })

  it('creates a pending request with a price snapshot and an audit entry', async () => {
    signInAs('customer')
    const booking = await bookingsService.createBooking(request({ staffId: 'stf_ken', notes: '  Short on the sides ' }))

    expect(booking).toMatchObject({
      status: 'pending',
      staffName: 'Ken',
      notes: 'Short on the sides',
      service: { name: 'Men’s Haircut', durationMinutes: 30, price: { type: 'fixed', amount: 250 } },
      business: { name: 'The Good Cut Barbershop', areaName: 'Poblacion' },
      end: zonedDateTime('2026-10-23', '14:30').toISOString(),
      respondBy: addMinutes(NOW, 24 * 60).toISOString(),
    })
    expect(booking.reference).toMatch(/^DP-[A-Z2-9]{6}$/)
    expect(booking.events).toMatchObject([{ action: 'submit', actor: 'customer', from: 'draft', to: 'pending' }])
  })

  it('returns the original booking when a submit is retried with the same key', async () => {
    signInAs('customer')
    const input = request()
    const first = await bookingsService.createBooking(input)
    const retry = await bookingsService.createBooking(input)
    expect(retry.id).toBe(first.id)
    expect((await bookingsService.listMyBookings()).filter((booking) => booking.id === first.id)).toHaveLength(1)
    await expect(bookingsService.createBooking(request())).rejects.toMatchObject({ status: 409 })
  })

  it('rejects times outside opening hours, too soon, or with the wrong staff', async () => {
    signInAs('customer')
    const at = (time: string, date = '2026-10-23') => zonedDateTime(date, time).toISOString()
    await expect(bookingsService.createBooking(request({ start: at('21:30') }))).rejects.toMatchObject({ status: 422 })
    await expect(bookingsService.createBooking(request({ start: at('11:30', '2026-10-21') }))).rejects.toMatchObject({
      status: 422,
    })
    await expect(bookingsService.createBooking(request({ staffId: 'stf_lia' }))).rejects.toMatchObject({ status: 422 })
  })

  it('lets a shop owner book other shops but not their own', async () => {
    signInAs('merchant')
    await expect(bookingsService.createBooking(request())).rejects.toMatchObject({
      status: 422,
      message: 'You can’t book your own business.',
    })
    const elsewhere = await bookingsService.createBooking(request({ serviceId: 'svc_gg_cut' }))
    expect(elsewhere).toMatchObject({ status: 'pending', customerId: mockUsers.merchant.id })
  })

  it('expires a request nobody answered in time', async () => {
    signInAs('customer')
    const booking = await bookingsService.createBooking(request())
    vi.setSystemTime(addMinutes(NOW, 25 * 60))

    const expired = await bookingsService.getBooking(booking.id)
    expect(expired.status).toBe('expired')
    expect(expired.events.at(-1)).toMatchObject({ action: 'expire', actor: 'system', actorId: null })
  })

  it('cancels with a reason recorded in the history', async () => {
    signInAs('customer')
    const cancelled = await bookingsService.cancelBooking('bk_andrea_confirmed', 'Feeling unwell')
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.events.at(-1)).toMatchObject({ action: 'cancel', actor: 'customer', reason: 'Feeling unwell' })
    await expect(bookingsService.cancelBooking('bk_andrea_confirmed')).rejects.toMatchObject({
      status: 409,
      code: 'invalid_transition',
    })
  })
})

describe('merchant responses (mock service)', () => {
  it('runs request → proposed time → customer accepts → confirmed', async () => {
    signInAs('customer')
    const { id } = await bookingsService.createBooking(request())

    signInAs('merchant')
    const newStart = zonedDateTime('2026-10-23', '16:00').toISOString()
    const proposed = await bookingsService.respondToBooking(id, {
      action: 'propose_alternative',
      start: newStart,
      message: 'Fully booked at 2. How about 4?',
    })
    expect(proposed.status).toBe('alternative_proposed')
    expect(proposed.proposal).toMatchObject({ start: newStart, message: 'Fully booked at 2. How about 4?' })

    signInAs('customer')
    const confirmed = await bookingsService.acceptAlternative(id)
    expect(confirmed).toMatchObject({ status: 'confirmed', start: newStart, proposal: undefined })
    expect(confirmed.events.map((event) => event.action)).toEqual([
      'submit',
      'propose_alternative',
      'accept_alternative',
    ])
    expect(confirmed.events[1]).toMatchObject({ actor: 'merchant', actorId: mockUsers.merchant.id })
  })

  it('rejects a proposed time when the shop is closed', async () => {
    signInAs('merchant')
    await expect(
      bookingsService.respondToBooking('bk_gc_carlos', {
        action: 'propose_alternative',
        start: zonedDateTime('2026-10-23', '22:00').toISOString(),
      }),
    ).rejects.toMatchObject({
      status: 422,
      message: 'The shop isn’t open for this service at that time. Choose another time.',
    })
  })

  it('rejects a proposed time the customer couldn’t answer in time', async () => {
    signInAs('merchant')
    await expect(
      bookingsService.respondToBooking('bk_gc_carlos', {
        action: 'propose_alternative',
        // 90 minutes from now: past the booking lead time, but the customer's deadline would already be gone.
        start: zonedDateTime('2026-10-21', '12:30').toISOString(),
      }),
    ).rejects.toMatchObject({
      status: 422,
      message: 'That’s too soon for the customer to answer. Choose a later time.',
    })
    const proposed = await bookingsService.respondToBooking('bk_gc_carlos', {
      action: 'propose_alternative',
      start: zonedDateTime('2026-10-21', '13:00').toISOString(),
    })
    expect(proposed.status).toBe('alternative_proposed')
  })

  it('returns a declined proposal to the merchant as pending', async () => {
    signInAs('customer')
    const booking = await bookingsService.declineAlternative('bk_andrea_alternative', 'Too late for me')
    expect(booking).toMatchObject({ status: 'pending', proposal: undefined })
  })

  it('accepts and declines only the merchant’s own pending requests', async () => {
    signInAs('merchant')
    expect((await bookingsService.respondToBooking('bk_gc_carlos', { action: 'accept' })).status).toBe('confirmed')
    await expect(bookingsService.respondToBooking('bk_gc_carlos', { action: 'accept' })).rejects.toMatchObject({
      status: 409,
    })
    const declined = await bookingsService.respondToBooking('bk_gc_bea', { action: 'decline', reason: 'No kids today' })
    expect(declined.events.at(-1)).toMatchObject({ action: 'decline', reason: 'No kids today' })

    await expect(bookingsService.getBusinessBooking('bk_andrea_alternative')).rejects.toMatchObject({ status: 404 })
    await expect(bookingsService.listBusinessBookings('biz_serenity')).rejects.toMatchObject({ status: 403 })
  })

  it('lists the business’s bookings for a date range', async () => {
    signInAs('merchant')
    const today = await bookingsService.listBusinessBookings('biz_good_cut', {
      from: zonedDateTime('2026-10-21', '00:00').toISOString(),
      to: zonedDateTime('2026-10-22', '00:00').toISOString(),
    })
    expect(today.map((booking) => booking.contact.name)).toEqual(['John Dela Cruz', 'Mark Rivera', 'Alyssa Santos'])
  })

  it('records outcomes only once the appointment has started', async () => {
    signInAs('merchant')
    expect((await bookingsService.recordOutcome('bk_gc_john', 'complete')).status).toBe('completed')
    await expect(bookingsService.recordOutcome('bk_gc_mark', 'mark_no_show')).rejects.toMatchObject({ status: 422 })
  })

  it('doesn’t let customers act as the merchant', async () => {
    signInAs('customer')
    await expect(bookingsService.respondToBooking('bk_andrea_pending', { action: 'accept' })).rejects.toMatchObject({
      status: 404,
    })
  })
})
