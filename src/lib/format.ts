import { market } from '@/config/market'
import type { ServicePrice } from '@/types/business'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })
const relativeFormatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' })

export function formatDate(value: string | Date) {
  return dateFormatter.format(new Date(value))
}

export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value))
}

const divisions: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.345, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

/** "3 hours ago", "yesterday", etc. */
export function formatRelative(value: string | Date, now: Date = new Date()) {
  let duration = (new Date(value).getTime() - now.getTime()) / 1000
  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) return relativeFormatter.format(Math.round(duration), division.unit)
    duration /= division.amount
  }
  return formatDate(value)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

// Market formatters: PHP prices and Asia/Manila times (doc §7.3). Prefer these
// for anything a customer or merchant sees.

const pesoFormatter = new Intl.NumberFormat(market.locale, {
  style: 'currency',
  currency: market.currency,
  maximumFractionDigits: 0,
})
const centavoFormatter = new Intl.NumberFormat(market.locale, { style: 'currency', currency: market.currency })

/** 1200 → "₱1,200"; 250.5 → "₱250.50". */
export function formatPeso(amount: number) {
  return (Number.isInteger(amount) ? pesoFormatter : centavoFormatter).format(amount)
}

/** "₱250", "From ₱1,200", "₱800–₱1,500" or "Price on consultation". */
export function formatPrice(price: ServicePrice) {
  switch (price.type) {
    case 'fixed':
      return formatPeso(price.amount)
    case 'from':
      return `From ${formatPeso(price.amount)}`
    case 'range':
      return `${formatPeso(price.amount)}–${formatPeso(price.maxAmount)}`
    case 'quote':
      return 'Price on consultation'
  }
}

/** 30 → "30 mins", 60 → "1 hr", 90 → "1 hr 30 mins". */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const parts: string[] = []
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hr' : 'hrs'}`)
  if (rest || !hours) parts.push(`${rest} ${rest === 1 ? 'min' : 'mins'}`)
  return parts.join(' ')
}

const timeFormatter = new Intl.DateTimeFormat(market.locale, {
  timeZone: market.timeZone,
  hour: 'numeric',
  minute: '2-digit',
})
const dayFormatter = new Intl.DateTimeFormat(market.locale, {
  timeZone: market.timeZone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const fullDateFormatter = new Intl.DateTimeFormat(market.locale, {
  timeZone: market.timeZone,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** "1:30 PM" in the market time zone. */
export function formatTime(value: string | Date) {
  return timeFormatter.format(new Date(value))
}

/** "Sat, Jul 12" in the market time zone. */
export function formatDay(value: string | Date) {
  return dayFormatter.format(new Date(value))
}

/** "Sat, Jul 12, 2025" in the market time zone (design screen 7). */
export function formatFullDate(value: string | Date) {
  return fullDateFormatter.format(new Date(value))
}

/** "Sat, Jul 12 · 1:30 PM". */
export function formatAppointment(value: string | Date) {
  return `${formatDay(value)} · ${formatTime(value)}`
}

/** 1.234 → "1.2 km"; 0.45 → "450 m". */
export function formatDistance(kilometres: number) {
  if (kilometres < 1) return `${Math.max(10, Math.round((kilometres * 1000) / 10) * 10)} m`
  return `${kilometres < 10 ? kilometres.toFixed(1) : Math.round(kilometres)} km`
}

const weekdayFormatter = new Intl.DateTimeFormat(market.locale, { timeZone: market.timeZone, weekday: 'short' })
const monthDayFormatter = new Intl.DateTimeFormat(market.locale, {
  timeZone: market.timeZone,
  month: 'short',
  day: 'numeric',
})

/** "Sat" in the market time zone. */
export function formatWeekday(value: string | Date) {
  return weekdayFormatter.format(new Date(value))
}

/** "Jul 12" in the market time zone. */
export function formatMonthDay(value: string | Date) {
  return monthDayFormatter.format(new Date(value))
}

const longDateFormatter = new Intl.DateTimeFormat(market.locale, {
  timeZone: market.timeZone,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

/** "Wednesday, October 21" in the market time zone. */
export function formatLongDate(value: string | Date) {
  return longDateFormatter.format(new Date(value))
}
