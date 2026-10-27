import { describe, expect, it } from 'vitest'

import { bookingRequestSchema, proposeTimeSchema } from '@/schemas/booking'
import { closureSchema, policiesSchema, timeRangeSchema, weeklyHoursSchema } from '@/schemas/business'
import { messageSchema } from '@/schemas/message'
import { moderationSchema } from '@/schemas/moderation'
import { serviceSchema } from '@/schemas/service'

/** The first error message for a failed parse, or undefined when it passes. */
function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? undefined : result.error?.issues[0]?.message
}

describe('booking request', () => {
  const valid = {
    serviceId: 'svc_mens_haircut',
    staffId: null,
    date: '2026-10-23',
    time: '13:30',
    phone: '',
    notes: '',
    policyAccepted: true,
  }

  it('accepts a complete request with any available staff', () => {
    expect(bookingRequestSchema.safeParse(valid).success).toBe(true)
  })

  it('requires the cancellation policy to be acknowledged (BKG-06)', () => {
    expect(firstError(bookingRequestSchema.safeParse({ ...valid, policyAccepted: false }))).toMatch(/policy/)
  })

  it('limits notes to 500 characters', () => {
    expect(firstError(bookingRequestSchema.safeParse({ ...valid, notes: 'a'.repeat(501) }))).toMatch(/500/)
  })

  it('normalises Philippine mobile numbers and rejects others', () => {
    const parsed = bookingRequestSchema.parse({ ...valid, phone: '0917 123-4567' })
    expect(parsed.phone).toBe('09171234567')
    expect(bookingRequestSchema.safeParse({ ...valid, phone: '+639171234567' }).success).toBe(true)
    expect(firstError(bookingRequestSchema.safeParse({ ...valid, phone: '12345' }))).toMatch(/mobile number/)
  })

  it('requires a date and time', () => {
    expect(firstError(bookingRequestSchema.safeParse({ ...valid, time: '' }))).toBe('Choose a time')
    expect(proposeTimeSchema.safeParse({ date: '2026-10-23', time: '25:00', message: '' }).success).toBe(false)
  })
})

describe('service', () => {
  const valid = {
    name: 'Men’s Haircut',
    categoryId: 'sub_haircut',
    description: '',
    requirements: '',
    price: { type: 'fixed', amount: 250 },
    durationMinutes: 30,
    bufferMinutes: 10,
    featured: false,
    active: true,
  }

  it('accepts each price type', () => {
    for (const price of [
      { type: 'fixed', amount: 250 },
      { type: 'from', amount: 1200 },
      { type: 'range', amount: 800, maxAmount: 1500 },
      { type: 'quote' },
    ]) {
      expect(serviceSchema.safeParse({ ...valid, price }).success).toBe(true)
    }
  })

  it('requires the top of a range to exceed the bottom', () => {
    const result = serviceSchema.safeParse({ ...valid, price: { type: 'range', amount: 1500, maxAmount: 800 } })
    expect(firstError(result)).toMatch(/highest price/)
  })

  it('keeps durations between 5 minutes and 8 hours in 5-minute steps', () => {
    expect(serviceSchema.safeParse({ ...valid, durationMinutes: 0 }).success).toBe(false)
    expect(serviceSchema.safeParse({ ...valid, durationMinutes: 485 }).success).toBe(false)
    expect(firstError(serviceSchema.safeParse({ ...valid, durationMinutes: 32 }))).toBe('Use 5-minute steps')
  })
})

describe('business hours and policies', () => {
  it('requires closing after opening', () => {
    expect(timeRangeSchema.safeParse({ open: '10:00', close: '24:00' }).success).toBe(true)
    expect(firstError(timeRangeSchema.safeParse({ open: '21:00', close: '10:00' }))).toMatch(/after opening/)
  })

  it('rejects overlapping ranges on one day', () => {
    const day = [
      { open: '13:00', close: '18:00' },
      { open: '09:00', close: '14:00' },
    ]
    const week = { 0: [], 1: day, 2: [], 3: [], 4: [], 5: [], 6: [] }
    expect(firstError(weeklyHoursSchema.safeParse(week))).toMatch(/overlap/)
  })

  it('requires closures to end on or after they start', () => {
    expect(closureSchema.safeParse({ startDate: '2026-12-24', endDate: '2026-12-26', reason: '' }).success).toBe(true)
    expect(closureSchema.safeParse({ startDate: '2026-12-26', endDate: '2026-12-24', reason: '' }).success).toBe(false)
  })

  it('requires a meaningful cancellation policy', () => {
    expect(policiesSchema.safeParse({ cancellation: 'No refunds', noShow: '', deposit: '' }).success).toBe(false)
  })
})

describe('messages and moderation', () => {
  it('trims messages and limits them to 2,000 characters', () => {
    expect(firstError(messageSchema.safeParse({ body: '   ' }))).toBe('Write a message')
    expect(messageSchema.safeParse({ body: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('requires a reason for every moderation action (ADM-01)', () => {
    expect(firstError(moderationSchema.safeParse({ action: 'suspend', reason: '' }))).toMatch(/reason/)
    expect(moderationSchema.safeParse({ action: 'approve', reason: 'All checks passed.' }).success).toBe(true)
  })
})
