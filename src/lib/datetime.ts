import { market } from '@/config/market'
import type { Weekday } from '@/types/business'
import type { DateKey, TimeOfDay } from '@/types/common'

// Calendar arithmetic in the market time zone (doc §7.3). Instants are stored
// in UTC; these helpers convert to and from the wall clock in `Asia/Manila`
// regardless of the device's own time zone.

const MINUTES_PER_DAY = 24 * 60
const MS_PER_MINUTE = 60_000

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string) {
  let formatter = partsFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    partsFormatters.set(timeZone, formatter)
  }
  return formatter
}

interface WallClock {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function wallClock(date: Date, timeZone: string): WallClock {
  const parts: Record<string, number> = {}
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** Minutes since midnight for `HH:mm`; accepts `24:00` as end of day. */
export function parseTimeOfDay(time: TimeOfDay): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) throw new RangeError(`Invalid time of day: ${time}`)
  const minutes = Number(match[1]) * 60 + Number(match[2])
  if (minutes > MINUTES_PER_DAY || Number(match[2]) > 59) throw new RangeError(`Invalid time of day: ${time}`)
  return minutes
}

/** `HH:mm` for minutes since midnight (0–1440). */
export function toTimeOfDay(minutes: number): TimeOfDay {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

function parseDateKey(dateKey: DateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) throw new RangeError(`Invalid date: ${dateKey}`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** The calendar date of `date` in the market time zone. */
export function toDateKey(date: Date, timeZone: string = market.timeZone): DateKey {
  const { year, month, day } = wallClock(date, timeZone)
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Minutes since local midnight of `date` in the market time zone. */
export function minutesIntoDay(date: Date, timeZone: string = market.timeZone): number {
  const { hour, minute } = wallClock(date, timeZone)
  return hour * 60 + minute
}

export function addDays(dateKey: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(dateKey)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(dateKey: DateKey): Weekday {
  const { year, month, day } = parseDateKey(dateKey)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday
}

function offsetMs(instant: number, timeZone: string) {
  const local = wallClock(new Date(instant), timeZone)
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second)
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** The instant at which the wall clock in `timeZone` shows `dateKey` + `minutes` (may exceed one day). */
export function zonedInstant(dateKey: DateKey, minutes: number, timeZone: string = market.timeZone): Date {
  const { year, month, day } = parseDateKey(dateKey)
  const guess = Date.UTC(year, month - 1, day) + minutes * MS_PER_MINUTE
  // Two passes settle the offset around daylight-saving changes (none in Manila, but cheap).
  const first = guess - offsetMs(guess, timeZone)
  return new Date(guess - offsetMs(first, timeZone))
}

/** `zonedInstant` for a `HH:mm` time. */
export function zonedDateTime(dateKey: DateKey, time: TimeOfDay, timeZone: string = market.timeZone): Date {
  return zonedInstant(dateKey, parseTimeOfDay(time), timeZone)
}

export function addMinutes(date: Date | string, minutes: number): Date {
  return new Date(new Date(date).getTime() + minutes * MS_PER_MINUTE)
}
