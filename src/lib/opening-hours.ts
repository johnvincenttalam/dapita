import { bookingRules } from '@/config/booking'
import { market } from '@/config/market'
import {
  addDays,
  addMinutes,
  minutesIntoDay,
  parseTimeOfDay,
  toDateKey,
  toTimeOfDay,
  weekdayOf,
  zonedInstant,
} from '@/lib/datetime'
import type { ClosurePeriod, TimeRange, Weekday, WeeklyHours } from '@/types/business'
import type { DateKey, TimeOfDay } from '@/types/common'

// Opening hours are wall-clock times in the market time zone. Everything here
// is pure and takes `now`, so it behaves the same on any device and in tests.

export const weekdayOrder: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0]

export const weekdayNames: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

interface Interval {
  start: Date
  end: Date
}

export function isClosedOn(closures: readonly ClosurePeriod[], dateKey: DateKey) {
  // Date keys compare correctly as strings.
  return closures.some((closure) => closure.startDate <= dateKey && dateKey <= closure.endDate)
}

function rangeLengthMinutes({ open, close }: TimeRange) {
  const length = parseTimeOfDay(close) - parseTimeOfDay(open)
  return length > 0 ? length : length + 24 * 60
}

/** Opening windows that start on `dateKey`, as instants. Overnight windows end the next day. */
function intervalsOn(hours: WeeklyHours, closures: readonly ClosurePeriod[], dateKey: DateKey): Interval[] {
  if (isClosedOn(closures, dateKey)) return []
  return hours[weekdayOf(dateKey)].map((range) => {
    const start = zonedInstant(dateKey, parseTimeOfDay(range.open))
    return { start, end: addMinutes(start, rangeLengthMinutes(range)) }
  })
}

/** Windows from yesterday (overnight hours) through `days` ahead, merged where they touch. */
function upcomingIntervals(hours: WeeklyHours, closures: readonly ClosurePeriod[], now: Date, days = 7) {
  const today = toDateKey(now)
  const intervals: Interval[] = []
  for (let offset = -1; offset <= days; offset++)
    intervals.push(...intervalsOn(hours, closures, addDays(today, offset)))
  intervals.sort((a, b) => a.start.getTime() - b.start.getTime())

  const merged: Interval[] = []
  for (const interval of intervals) {
    const last = merged.at(-1)
    if (last && interval.start <= last.end) {
      if (interval.end > last.end) last.end = interval.end
    } else {
      merged.push({ ...interval })
    }
  }
  return merged
}

export type OpenStatus =
  | { isOpen: true; closesAt: Date }
  /** `opensAt` is null when there is no opening in the next week. */
  | { isOpen: false; opensAt: Date | null }

export function getOpenStatus(
  hours: WeeklyHours,
  closures: readonly ClosurePeriod[],
  now: Date = new Date(),
): OpenStatus {
  const intervals = upcomingIntervals(hours, closures, now)
  const current = intervals.find((interval) => interval.start <= now && now < interval.end)
  if (current) return { isOpen: true, closesAt: current.end }
  return { isOpen: false, opensAt: intervals.find((interval) => interval.start > now)?.start ?? null }
}

export function hasOpeningHours(hours: WeeklyHours) {
  return weekdayOrder.some((day) => hours[day].length > 0)
}

const clockFormatter = new Intl.DateTimeFormat(market.locale, {
  timeZone: market.timeZone,
  hour: 'numeric',
  minute: '2-digit',
})
const timeOfDayFormatter = new Intl.DateTimeFormat(market.locale, {
  timeZone: 'UTC',
  hour: 'numeric',
  minute: '2-digit',
})
const weekdayFormatter = new Intl.DateTimeFormat(market.locale, { timeZone: market.timeZone, weekday: 'short' })

/** `21:00` → "9:00 PM". */
export function formatTimeOfDay(time: TimeOfDay) {
  const minutes = parseTimeOfDay(time) % (24 * 60)
  return timeOfDayFormatter.format(new Date(Date.UTC(2000, 0, 1, 0, minutes)))
}

export function formatTimeRange(range: TimeRange) {
  return `${formatTimeOfDay(range.open)} – ${formatTimeOfDay(range.close)}`
}

/** "Open" / "Closed" plus the detail from design screens 4–5, e.g. "Closes 9:00 PM", "Opens tomorrow 10:00 AM". */
export function describeOpenStatus(status: OpenStatus, now: Date = new Date()): { label: string; detail?: string } {
  if (status.isOpen) {
    const hoursLeft = (status.closesAt.getTime() - now.getTime()) / 3_600_000
    if (hoursLeft >= 24) return { label: 'Open', detail: 'Open 24 hours' }
    return { label: 'Open', detail: `Closes ${clockFormatter.format(status.closesAt)}` }
  }
  if (!status.opensAt) return { label: 'Closed' }
  const time = clockFormatter.format(status.opensAt)
  const opensOn = toDateKey(status.opensAt)
  const today = toDateKey(now)
  if (opensOn === today) return { label: 'Closed', detail: `Opens ${time}` }
  if (opensOn === addDays(today, 1)) return { label: 'Closed', detail: `Opens tomorrow ${time}` }
  return { label: 'Closed', detail: `Opens ${weekdayFormatter.format(status.opensAt)} ${time}` }
}

/** Monday-first rows for an hours table: "9:00 AM – 9:00 PM" or "Closed". */
export function weeklySchedule(hours: WeeklyHours) {
  return weekdayOrder.map((weekday) => ({
    weekday,
    name: weekdayNames[weekday],
    ranges: hours[weekday].map(formatTimeRange),
  }))
}

export interface PreferredTime {
  time: TimeOfDay
  /** ISO instant of the start. */
  start: string
}

/**
 * Start times on `dateKey` at which a service of `durationMinutes` fits inside
 * the opening hours. In request mode these are *preferred* times derived from
 * hours only, not live availability (plan C1/C2): the merchant still confirms.
 */
export function preferredStartTimes(
  hours: WeeklyHours,
  closures: readonly ClosurePeriod[],
  dateKey: DateKey,
  durationMinutes: number,
  now: Date = new Date(),
  {
    stepMinutes = bookingRules.slotStepMinutes,
    leadMinutes = bookingRules.minLeadTimeMinutes,
  }: { stepMinutes?: number; leadMinutes?: number } = {},
): PreferredTime[] {
  const earliest = addMinutes(now, leadMinutes)
  const times: PreferredTime[] = []
  for (const interval of intervalsOn(hours, closures, dateKey)) {
    const last = addMinutes(interval.end, -durationMinutes)
    for (let start = interval.start; start <= last; start = addMinutes(start, stepMinutes)) {
      if (start < earliest) continue
      times.push({ time: toTimeOfDay(minutesIntoDay(start)), start: start.toISOString() })
    }
  }
  return times
}

/** True when `start` is one of the preferred start times on its own date. */
export function isPreferredStartTime(
  hours: WeeklyHours,
  closures: readonly ClosurePeriod[],
  start: Date,
  durationMinutes: number,
  now: Date = new Date(),
) {
  const iso = start.toISOString()
  // An overnight window may begin the previous day.
  const dateKey = toDateKey(start)
  return [dateKey, addDays(dateKey, -1)].some((day) =>
    preferredStartTimes(hours, closures, day, durationMinutes, now).some((slot) => slot.start === iso),
  )
}
