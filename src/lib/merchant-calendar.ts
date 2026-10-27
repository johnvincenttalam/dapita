import { addDays, minutesIntoDay, parseTimeOfDay, toDateKey, weekdayOf } from '@/lib/datetime'
import type { BookingDetails } from '@/types/booking'
import type { ClosurePeriod, StaffMember, WeeklyHours } from '@/types/business'
import type { DateKey } from '@/types/common'

/**
 * How an appointment shows on the calendar. Requests and proposed times hold a
 * slot that isn't agreed yet; they are drawn differently from confirmed ones.
 */
export type EntryKind = 'confirmed' | 'request' | 'proposed' | 'done'

export interface CalendarEntry {
  booking: BookingDetails
  kind: EntryKind
  /** The slot the booking holds: the offered time for a proposal, otherwise the booking's own. */
  start: string
  end: string
}

export type CalendarView = 'day' | 'week'

const kinds: Partial<Record<BookingDetails['status'], EntryKind>> = {
  confirmed: 'confirmed',
  pending: 'request',
  alternative_proposed: 'proposed',
  completed: 'done',
}

const time = (value: string) => new Date(value).getTime()

/**
 * Appointments starting from `from` through `to` (inclusive date keys), in time order.
 * A confirmed appointment that has ended shows as done, as on the dashboard.
 */
export function calendarEntries(bookings: BookingDetails[], from: DateKey, to: DateKey, now: Date): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  for (const booking of bookings) {
    let kind = kinds[booking.status]
    if (!kind) continue
    if (kind === 'confirmed' && time(booking.end) <= now.getTime()) kind = 'done'
    const slot = kind === 'proposed' && booking.proposal ? booking.proposal : booking
    const day = toDateKey(new Date(slot.start))
    if (day >= from && day <= to) entries.push({ booking, kind, start: slot.start, end: slot.end })
  }
  return entries.sort((a, b) => time(a.start) - time(b.start))
}

export interface DayWindow {
  /** Minutes after midnight the grid starts and ends, on whole hours. */
  startMinutes: number
  endMinutes: number
  /** Why the shop is shut that day, if it is: its weekly hours, or a one-off closure. */
  closed?: 'weekly' | 'closure'
  closure?: ClosurePeriod
}

const HOUR = 60
const FALLBACK = { startMinutes: 9 * HOUR, endMinutes: 18 * HOUR }

/** The hours to draw for a day: opening hours, widened to fit any appointment outside them. */
export function dayWindow(
  hours: WeeklyHours,
  closures: readonly ClosurePeriod[],
  date: DateKey,
  entries: CalendarEntry[],
): DayWindow {
  const closure = closures.find((candidate) => candidate.startDate <= date && date <= candidate.endDate)
  const ranges = closure ? [] : hours[weekdayOf(date)]
  let start = Math.min(...ranges.map((range) => parseTimeOfDay(range.open)))
  let end = Math.max(...ranges.map((range) => parseTimeOfDay(range.close)))
  if (!ranges.length) ({ startMinutes: start, endMinutes: end } = FALLBACK)
  for (const entry of entries) {
    start = Math.min(start, minutesIntoDay(new Date(entry.start)))
    end = Math.max(end, minutesIntoDay(new Date(entry.end)) || 24 * HOUR)
  }
  const window: DayWindow = {
    startMinutes: Math.floor(start / HOUR) * HOUR,
    endMinutes: Math.min(Math.ceil(end / HOUR) * HOUR, 24 * HOUR),
  }
  if (closure) return { ...window, closed: 'closure', closure }
  return ranges.length ? window : { ...window, closed: 'weekly' }
}

export interface ScheduleColumn {
  id: string
  title: string
  entries: CalendarEntry[]
}

/** One column per staff member, then "Any staff" for requests that didn't pick anyone. */
export function scheduleColumns(entries: CalendarEntry[], staff: StaffMember[]): ScheduleColumn[] {
  if (staff.length === 0) return [{ id: 'all', title: 'Appointments', entries }]
  const columns = staff.map((member) => ({
    id: member.id,
    title: member.displayName,
    entries: entries.filter((entry) => entry.booking.staffId === member.id),
  }))
  const known = new Set(staff.map((member) => member.id))
  const unassigned = entries.filter((entry) => !entry.booking.staffId || !known.has(entry.booking.staffId))
  return unassigned.length ? [...columns, { id: 'any', title: 'Any staff', entries: unassigned }] : columns
}

/** Overlapping appointments in one column share its width: `lane` of `lanes`. */
export function assignLanes(entries: CalendarEntry[]): (CalendarEntry & { lane: number; lanes: number })[] {
  const placed: (CalendarEntry & { lane: number; lanes: number })[] = []
  let group: typeof placed = []
  let groupEnd = -Infinity
  const close = () => {
    const lanes = Math.max(1, ...group.map((entry) => entry.lane + 1))
    for (const entry of group) entry.lanes = lanes
    group = []
  }
  for (const entry of [...entries].sort((a, b) => time(a.start) - time(b.start))) {
    if (time(entry.start) >= groupEnd) {
      close()
      groupEnd = -Infinity
    }
    // The first lane whose last appointment has ended.
    const busy = new Set(group.filter((other) => time(other.end) > time(entry.start)).map((other) => other.lane))
    let lane = 0
    while (busy.has(lane)) lane++
    const item = { ...entry, lane, lanes: 1 }
    group.push(item)
    placed.push(item)
    groupEnd = Math.max(groupEnd, time(entry.end))
  }
  close()
  return placed
}

/** The Monday-to-Sunday week containing `date`. */
export function weekOf(date: DateKey): DateKey[] {
  const monday = addDays(date, -((weekdayOf(date) + 6) % 7))
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

/** `?view=day|week&date=YYYY-MM-DD`, falling back to today's day view. */
export function parseCalendarParams(params: URLSearchParams, today: DateKey): { view: CalendarView; date: DateKey } {
  const view = params.get('view') === 'week' ? 'week' : 'day'
  const date = params.get('date') ?? ''
  return { view, date: /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : today }
}
