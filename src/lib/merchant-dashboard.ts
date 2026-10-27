import { addDays, minutesIntoDay, toDateKey } from '@/lib/datetime'
import { getMerchantTab } from '@/lib/merchant-bookings'
import type { BookingDetails } from '@/types/booking'

/** Where an appointment on today's list stands: finished, under way, the next one up, or later. */
export type AppointmentPhase = 'done' | 'now' | 'next' | 'later'

export interface DashboardSummary {
  /** Pending requests, soonest deadline first. */
  waiting: BookingDetails[]
  /** New times the shop proposed that the customer hasn't answered yet. */
  proposedCount: number
  today: { booking: BookingDetails; phase: AppointmentPhase }[]
  /** Confirmed appointments from tomorrow through seven days from today. */
  nextSevenDays: number
}

const time = (value: string | undefined) => (value ? new Date(value).getTime() : Number.POSITIVE_INFINITY)

/** The merchant overview (design screen 12), from the same list the Bookings page reads. */
export function summarizeDashboard(bookings: BookingDetails[], now: Date): DashboardSummary {
  const today = toDateKey(now)
  const weekEnd = addDays(today, 7)
  const waiting = bookings
    .filter((booking) => booking.status === 'pending')
    .sort((a, b) => time(a.respondBy) - time(b.respondBy))
  const proposedCount = bookings.filter(
    (booking) => booking.status === 'alternative_proposed' && getMerchantTab(booking, now) === 'requests',
  ).length

  const todays = bookings
    .filter(
      (booking) =>
        (booking.status === 'confirmed' || booking.status === 'completed') &&
        toDateKey(new Date(booking.start)) === today,
    )
    .sort((a, b) => time(a.start) - time(b.start))
  let nextFound = false
  const todayRows = todays.map((booking) => {
    let phase: AppointmentPhase
    if (booking.status === 'completed' || time(booking.end) <= now.getTime()) phase = 'done'
    else if (time(booking.start) <= now.getTime()) phase = 'now'
    else if (!nextFound) phase = 'next'
    else phase = 'later'
    if (phase === 'next') nextFound = true
    return { booking, phase }
  })

  const nextSevenDays = bookings.filter((booking) => {
    if (booking.status !== 'confirmed') return false
    const day = toDateKey(new Date(booking.start))
    return day > today && day <= weekEnd
  }).length

  return { waiting, proposedCount, today: todayRows, nextSevenDays }
}

/** "Good morning" until noon, "Good afternoon" until 6 PM, then "Good evening" (through the small hours). */
export function greetingFor(now: Date): string {
  const hour = minutesIntoDay(now) / 60
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}
