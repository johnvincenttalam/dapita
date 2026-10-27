import { describe, expect, it } from 'vitest'

import { addDays, toDateKey, weekdayOf, zonedDateTime } from '@/lib/datetime'
import {
  describeOpenStatus,
  formatTimeOfDay,
  getOpenStatus,
  isPreferredStartTime,
  preferredStartTimes,
  weeklySchedule,
} from '@/lib/opening-hours'
import type { TimeRange, Weekday, WeeklyHours } from '@/types/business'

// Asia/Manila is UTC+8 all year. Instants below are written in UTC so the tests
// don't depend on the machine's time zone. 21 Oct 2026 is a Wednesday.

function everyDay(open: string, close: string, closedOn: Weekday[] = []): WeeklyHours {
  const day = (weekday: Weekday): TimeRange[] => (closedOn.includes(weekday) ? [] : [{ open, close }])
  return { 0: day(0), 1: day(1), 2: day(2), 3: day(3), 4: day(4), 5: day(5), 6: day(6) }
}

const describeAt = (hours: WeeklyHours, iso: string, closures = []) => {
  const now = new Date(iso)
  return describeOpenStatus(getOpenStatus(hours, closures, now), now)
}

describe('market date helpers', () => {
  it('reads the calendar date in Manila, not the device zone', () => {
    expect(toDateKey(new Date('2026-10-21T17:30:00Z'))).toBe('2026-10-22')
    expect(weekdayOf('2026-10-21')).toBe(3)
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })

  it('converts Manila wall-clock times to UTC instants', () => {
    expect(zonedDateTime('2026-10-21', '13:30').toISOString()).toBe('2026-10-21T05:30:00.000Z')
    expect(zonedDateTime('2026-10-21', '24:00').toISOString()).toBe('2026-10-21T16:00:00.000Z')
  })
})

describe('open status', () => {
  const barbershop = everyDay('10:00', '21:00')

  it('shows when an open shop closes (design screen 5)', () => {
    expect(describeAt(barbershop, '2026-10-21T04:00:00Z')).toEqual({ label: 'Open', detail: 'Closes 9:00 PM' })
  })

  it('shows today’s opening time before opening', () => {
    expect(describeAt(barbershop, '2026-10-21T00:00:00Z')).toEqual({ label: 'Closed', detail: 'Opens 10:00 AM' })
  })

  it('shows tomorrow’s opening time after closing', () => {
    expect(describeAt(barbershop, '2026-10-21T14:00:00Z')).toEqual({
      label: 'Closed',
      detail: 'Opens tomorrow 10:00 AM',
    })
  })

  it('names the weekday when the next opening is further away', () => {
    const weekdaysOnly = everyDay('09:00', '18:00', [0, 6])
    // Friday 23 Oct, 20:00 in Manila → opens Monday.
    expect(describeAt(weekdaysOnly, '2026-10-23T12:00:00Z')).toEqual({ label: 'Closed', detail: 'Opens Mon 9:00 AM' })
  })

  it('keeps an overnight shop open past midnight', () => {
    const lateNight = everyDay('18:00', '02:00')
    // Thursday 01:00 in Manila, inside Wednesday's window.
    expect(describeAt(lateNight, '2026-10-21T17:00:00Z')).toEqual({ label: 'Open', detail: 'Closes 2:00 AM' })
  })

  it('treats 24:00 as midnight and joins back-to-back days', () => {
    expect(describeAt(everyDay('12:00', '24:00'), '2026-10-21T15:00:00Z')).toEqual({
      label: 'Open',
      detail: 'Closes 12:00 AM',
    })
    expect(describeAt(everyDay('00:00', '24:00'), '2026-10-21T15:00:00Z')).toEqual({
      label: 'Open',
      detail: 'Open 24 hours',
    })
  })

  it('respects closure dates', () => {
    const now = new Date('2026-10-21T04:00:00Z')
    const closures = [{ id: 'c1', startDate: '2026-10-21', endDate: '2026-10-22' }]
    expect(describeOpenStatus(getOpenStatus(barbershop, closures, now), now)).toEqual({
      label: 'Closed',
      detail: 'Opens Fri 10:00 AM',
    })
  })

  it('reports no upcoming opening for a shop without hours', () => {
    expect(describeAt(everyDay('10:00', '21:00', [0, 1, 2, 3, 4, 5, 6]), '2026-10-21T04:00:00Z')).toEqual({
      label: 'Closed',
    })
  })
})

describe('weekly schedule', () => {
  it('lists Monday first with formatted ranges', () => {
    const rows = weeklySchedule(everyDay('10:00', '21:00', [1]))
    expect(rows[0]).toEqual({ weekday: 1, name: 'Monday', ranges: [] })
    expect(rows[6]).toEqual({ weekday: 0, name: 'Sunday', ranges: ['10:00 AM – 9:00 PM'] })
    expect(formatTimeOfDay('24:00')).toBe('12:00 AM')
  })
})

describe('preferred start times', () => {
  const salon = everyDay('10:00', '12:00')

  it('offers 30-minute steps where the whole service fits before closing', () => {
    const now = new Date('2026-10-20T00:00:00Z')
    const times = preferredStartTimes(salon, [], '2026-10-21', 60, now).map((slot) => slot.time)
    expect(times).toEqual(['10:00', '10:30', '11:00'])
  })

  it('skips times inside the minimum lead time', () => {
    // 10:15 in Manila; the earliest bookable start is 11:15.
    const now = new Date('2026-10-21T02:15:00Z')
    expect(preferredStartTimes(salon, [], '2026-10-21', 30, now).map((slot) => slot.time)).toEqual(['11:30'])
  })

  it('offers nothing on closure dates', () => {
    const now = new Date('2026-10-20T00:00:00Z')
    const closures = [{ id: 'c1', startDate: '2026-10-21', endDate: '2026-10-21' }]
    expect(preferredStartTimes(salon, closures, '2026-10-21', 30, now)).toEqual([])
  })

  it('validates a requested start against the same rules', () => {
    const now = new Date('2026-10-20T00:00:00Z')
    expect(isPreferredStartTime(salon, [], zonedDateTime('2026-10-21', '11:00'), 60, now)).toBe(true)
    expect(isPreferredStartTime(salon, [], zonedDateTime('2026-10-21', '11:30'), 60, now)).toBe(false)
    expect(isPreferredStartTime(salon, [], zonedDateTime('2026-10-21', '10:10'), 30, now)).toBe(false)
  })
})
