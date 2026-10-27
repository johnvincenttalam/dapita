import { bookingRules } from '@/config/booking'
import { addDays, toDateKey } from '@/lib/datetime'
import { formatTime, formatWeekday } from '@/lib/format'
import type { Booking, BookingDetails } from '@/types/booking'

/** The merchant's Bookings tabs. Not the customer's grouping (`getBookingTab`). */
export type MerchantTab = 'requests' | 'upcoming' | 'past'

/**
 * Requests are bookings still waiting for an answer from either side; a
 * proposed time stays there until the customer answers or its time passes.
 */
export function getMerchantTab(booking: Pick<Booking, 'status' | 'end' | 'proposal'>, now: Date): MerchantTab {
  if (booking.status === 'pending') return 'requests'
  // Until the customer accepts, `start`/`end` are still the original request; the offer is in `proposal`.
  if (booking.status === 'alternative_proposed' && new Date(booking.proposal?.end ?? booking.end) > now) {
    return 'requests'
  }
  if (booking.status === 'confirmed' && new Date(booking.end) > now) return 'upcoming'
  return 'past'
}

/** A booking on the merchant's Bookings page, opened under the tab it belongs to. */
export const merchantBookingHref = (id: string, tab: MerchantTab) =>
  `/business/bookings/${encodeURIComponent(id)}${tab === 'requests' ? '' : `?tab=${tab}`}`

const time = (value: string | undefined) => (value ? new Date(value).getTime() : Number.POSITIVE_INFINITY)

/** Pending requests by deadline (then proposed times), upcoming soonest first, past newest first. */
export function groupMerchantBookings(bookings: BookingDetails[], now: Date): Record<MerchantTab, BookingDetails[]> {
  const groups: Record<MerchantTab, BookingDetails[]> = { requests: [], upcoming: [], past: [] }
  for (const booking of bookings) groups[getMerchantTab(booking, now)].push(booking)
  const pending = groups.requests
    .filter((b) => b.status === 'pending')
    .sort((a, b) => time(a.respondBy) - time(b.respondBy))
  const proposed = groups.requests
    .filter((b) => b.status !== 'pending')
    .sort((a, b) => time(a.proposal?.start ?? a.start) - time(b.proposal?.start ?? b.start))
  groups.requests = [...pending, ...proposed]
  groups.upcoming.sort((a, b) => time(a.start) - time(b.start))
  groups.past.sort((a, b) => time(b.start) - time(a.start))
  return groups
}

/** The request to open after answering `afterId`, if any is still waiting. */
export function nextPendingId(grouped: Record<MerchantTab, BookingDetails[]>, afterId: string): string | undefined {
  return grouped.requests.find((booking) => booking.status === 'pending' && booking.id !== afterId)?.id
}

export interface Clash {
  booking: BookingDetails
  start: string
  end: string
}

/**
 * Confirmed bookings and proposed times that overlap `start`–`end`. With a
 * named staff member only their bookings count; "any staff" checks them all.
 * Only bookings made on Dapita are known, so this is a warning, never a block.
 */
export function findClashes(
  target: Pick<Booking, 'id' | 'staffId'>,
  start: string,
  end: string,
  bookings: BookingDetails[],
): Clash[] {
  const from = time(start)
  const to = time(end)
  const clashes: Clash[] = []
  for (const booking of bookings) {
    if (booking.id === target.id) continue
    if (target.staffId && booking.staffId !== target.staffId) continue
    const slot =
      booking.status === 'confirmed'
        ? { start: booking.start, end: booking.end }
        : booking.status === 'alternative_proposed' && booking.proposal
          ? { start: booking.proposal.start, end: booking.proposal.end }
          : undefined
    if (slot && from < time(slot.end) && time(slot.start) < to) clashes.push({ booking, ...slot })
  }
  return clashes.sort((a, b) => time(a.start) - time(b.start))
}

/** "2:00–3:00 PM", or "11:30 AM–12:30 PM" across noon. */
export function formatTimeSpan(start: string, end: string) {
  const from = formatTime(start)
  const to = formatTime(end)
  const meridiem = to.slice(-3)
  return from.endsWith(meridiem) ? `${from.slice(0, -3)}–${to}` : `${from}–${to}`
}

function describeOne({ booking, start, end }: Clash) {
  const kind = booking.status === 'alternative_proposed' ? 'a proposed time' : 'a confirmed booking'
  return `${kind} at ${formatTimeSpan(start, end)} (${booking.contact.name})`
}

/** The clash note: "Ken already has a confirmed booking at 2:00–3:00 PM (John Dela Cruz)." */
export function describeClash(clashes: Clash[], staffName: string | undefined): string | undefined {
  if (clashes.length === 0) return undefined
  const listed = clashes.slice(0, 2).map(describeOne).join(' and ')
  const more = clashes.length > 2 ? ` +${clashes.length - 2} more` : ''
  return `${staffName ?? 'The shop'} already has ${listed}${more}.`
}

/** The merchant's deadline. Urgency is carried by wording and weight, never a status colour. */
export function formatAnswerBy(respondBy: string, now: Date): { text: string; urgent: boolean } {
  const minutes = (time(respondBy) - now.getTime()) / 60_000
  if (minutes <= bookingRules.responseCutoffMinutes) {
    return { text: `Answer within ${Math.max(1, Math.ceil(minutes))} min`, urgent: true }
  }
  const today = toDateKey(now)
  const day = toDateKey(new Date(respondBy))
  const label = day === today ? 'today' : day === addDays(today, 1) ? 'tomorrow' : formatWeekday(respondBy)
  return { text: `Answer by ${label}, ${formatTime(respondBy)}`, urgent: false }
}

/**
 * Milliseconds until the soonest open request or proposal reaches its deadline
 * (0 if one already has), so the page can re-read the list as it expires.
 */
export function msUntilNextExpiry(bookings: BookingDetails[], now: Date): number | undefined {
  let soonest: number | undefined
  for (const booking of bookings) {
    if ((booking.status !== 'pending' && booking.status !== 'alternative_proposed') || !booking.respondBy) continue
    const ms = Math.max(0, time(booking.respondBy) - now.getTime())
    if (soonest === undefined || ms < soonest) soonest = ms
  }
  return soonest
}
