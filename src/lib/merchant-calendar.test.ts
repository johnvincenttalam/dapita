import { describe, expect, it } from 'vitest'

import { addMinutes, zonedDateTime } from '@/lib/datetime'
import {
  assignLanes,
  calendarEntries,
  dayWindow,
  parseCalendarParams,
  scheduleColumns,
  weekOf,
} from '@/lib/merchant-calendar'
import type { BookingDetails, BookingStatus } from '@/types/booking'
import type { StaffMember, WeeklyHours } from '@/types/business'

// Wednesday 21 Oct 2026, 8:00 in Manila: before the day's first appointment.
const NOW = new Date('2026-10-21T00:00:00Z')

const at = (date: string, time: string) => zonedDateTime(date, time).toISOString()

let counter = 0
function make(overrides: Partial<BookingDetails> & { status: BookingStatus }): BookingDetails {
  const start = overrides.start ?? at('2026-10-21', '10:00')
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
    createdAt: start,
    updatedAt: start,
    business: { id: 'biz_good_cut', slug: 'the-good-cut', name: 'The Good Cut', address: '', areaName: 'Poblacion' },
    events: [],
    ...overrides,
  }
}

const range = (open: string, close: string) => [{ open, close }]
const hours: WeeklyHours = {
  0: [],
  1: range('10:00', '21:00'),
  2: range('10:00', '21:00'),
  3: range('10:00', '21:00'),
  4: range('10:00', '21:00'),
  5: range('10:00', '21:00'),
  6: range('10:00', '21:00'),
}

const staff = (id: string, displayName: string): StaffMember => ({
  id,
  businessId: 'biz_good_cut',
  displayName,
  serviceIds: [],
  active: true,
})

describe('calendarEntries', () => {
  it('shows confirmed, requested and proposed times, and leaves out closed bookings', () => {
    const confirmed = make({ status: 'confirmed' })
    const pending = make({ status: 'pending', start: at('2026-10-21', '15:00') })
    const proposed = make({
      status: 'alternative_proposed',
      start: at('2026-10-22', '09:00'),
      proposal: {
        start: at('2026-10-21', '17:00'),
        end: at('2026-10-21', '18:00'),
        proposedAt: at('2026-10-20', '09:00'),
      },
    })
    const completed = make({ status: 'completed', start: at('2026-10-21', '08:00') })
    const gone = ['cancelled', 'declined', 'expired', 'no_show'].map((status) =>
      make({ status: status as BookingStatus }),
    )

    const entries = calendarEntries([proposed, ...gone, pending, completed, confirmed], '2026-10-21', '2026-10-21', NOW)

    expect(entries.map((entry) => [entry.booking.id, entry.kind])).toEqual([
      [completed.id, 'done'],
      [confirmed.id, 'confirmed'],
      [pending.id, 'request'],
      [proposed.id, 'proposed'],
    ])
    // A proposed booking holds the offered time, not the one first asked for.
    expect(entries[3]).toMatchObject({ start: at('2026-10-21', '17:00'), end: at('2026-10-21', '18:00') })
  })

  it('shows a confirmed appointment that has finished as done', () => {
    const finished = make({ status: 'confirmed', start: at('2026-10-21', '06:00') })
    expect(calendarEntries([finished], '2026-10-21', '2026-10-21', NOW)[0]?.kind).toBe('done')
  })

  it('keeps to the dates asked for', () => {
    const entries = calendarEntries(
      [make({ status: 'confirmed', start: at('2026-10-20', '20:00') }), make({ status: 'confirmed' })],
      '2026-10-21',
      '2026-10-27',
      NOW,
    )
    expect(entries).toHaveLength(1)
  })
})

describe('dayWindow', () => {
  it('spans the opening hours, widened to fit appointments outside them', () => {
    expect(dayWindow(hours, [], '2026-10-21', [])).toMatchObject({ startMinutes: 600, endMinutes: 1260 })
    const early = calendarEntries(
      [make({ status: 'confirmed', start: at('2026-10-21', '08:30') })],
      '2026-10-21',
      '2026-10-21',
      NOW,
    )
    expect(dayWindow(hours, [], '2026-10-21', early)).toMatchObject({ startMinutes: 480, endMinutes: 1260 })
  })

  it('says why a day is closed', () => {
    expect(dayWindow(hours, [], '2026-10-25', [])).toMatchObject({
      closed: 'weekly',
      startMinutes: 540,
      endMinutes: 1080,
    })
    const closure = { id: 'cl_1', startDate: '2026-10-21', endDate: '2026-10-21', reason: 'Training' }
    expect(dayWindow(hours, [closure], '2026-10-21', [])).toMatchObject({ closed: 'closure', closure })
  })
})

describe('scheduleColumns', () => {
  it('gives each staff member a column, plus one for any staff when needed', () => {
    const entries = calendarEntries(
      [make({ status: 'confirmed', staffId: 'stf_mark' }), make({ status: 'pending', staffId: null })],
      '2026-10-21',
      '2026-10-21',
      NOW,
    )
    const columns = scheduleColumns(entries, [staff('stf_ken', 'Ken'), staff('stf_mark', 'Mark')])
    expect(columns.map((column) => [column.title, column.entries.length])).toEqual([
      ['Ken', 0],
      ['Mark', 1],
      ['Any staff', 1],
    ])
    expect(scheduleColumns([], [staff('stf_ken', 'Ken')]).map((column) => column.title)).toEqual(['Ken'])
  })

  it('uses a single column when the shop keeps no staff list', () => {
    const entries = calendarEntries([make({ status: 'confirmed' })], '2026-10-21', '2026-10-21', NOW)
    expect(scheduleColumns(entries, []).map((column) => column.title)).toEqual(['Appointments'])
  })
})

describe('assignLanes', () => {
  it('puts overlapping appointments side by side', () => {
    const entries = calendarEntries(
      [
        make({ status: 'confirmed', start: at('2026-10-21', '10:00') }),
        make({ status: 'pending', start: at('2026-10-21', '10:30') }),
        make({ status: 'confirmed', start: at('2026-10-21', '12:00') }),
      ],
      '2026-10-21',
      '2026-10-21',
      NOW,
    )
    expect(assignLanes(entries).map(({ lane, lanes }) => [lane, lanes])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1],
    ])
  })
})

describe('weekOf', () => {
  it('runs Monday to Sunday', () => {
    expect(weekOf('2026-10-21')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(weekOf('2026-10-25')[0]).toBe('2026-10-19')
  })
})

describe('parseCalendarParams', () => {
  it('defaults to today’s day view and ignores bad input', () => {
    expect(parseCalendarParams(new URLSearchParams(''), '2026-10-21')).toEqual({ view: 'day', date: '2026-10-21' })
    expect(parseCalendarParams(new URLSearchParams('view=week&date=2026-11-02'), '2026-10-21')).toEqual({
      view: 'week',
      date: '2026-11-02',
    })
    expect(parseCalendarParams(new URLSearchParams('view=month&date=soon'), '2026-10-21')).toEqual({
      view: 'day',
      date: '2026-10-21',
    })
  })
})
