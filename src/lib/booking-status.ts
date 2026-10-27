import { bookingRules } from '@/config/booking'
import { addMinutes } from '@/lib/datetime'
import type { Booking, BookingAction, BookingActor, BookingStatus, BookingTab } from '@/types/booking'
import type { ISODateTime } from '@/types/common'

// The booking state machine from doc §7.2, shared by the customer, merchant and
// admin views and by the mock backend. The real server must enforce the same
// rules; the UI only uses this to decide what to offer and how to label it.

interface TransitionRule {
  to: BookingStatus
  /** The states each actor may perform this action from. Missing actors may not perform it. */
  from: Partial<Record<BookingActor, readonly BookingStatus[]>>
}

const AWAITING_RESPONSE = ['pending', 'alternative_proposed'] as const satisfies readonly BookingStatus[]
const ACTIVE = ['pending', 'alternative_proposed', 'confirmed'] as const satisfies readonly BookingStatus[]

export const bookingTransitions: Record<BookingAction, TransitionRule> = {
  submit: { to: 'pending', from: { customer: ['draft'] } },
  accept: { to: 'confirmed', from: { merchant: ['pending'] } },
  decline: { to: 'declined', from: { merchant: ['pending'] } },
  propose_alternative: { to: 'alternative_proposed', from: { merchant: ['pending'] } },
  // An alternative becomes confirmed only after the customer accepts it (BKG-03).
  accept_alternative: { to: 'confirmed', from: { customer: ['alternative_proposed'] } },
  // Declining the proposal keeps the original request open for the merchant.
  decline_alternative: { to: 'pending', from: { customer: ['alternative_proposed'] } },
  // A merchant answers an open request with decline or propose, and can cancel only a confirmed one.
  cancel: { to: 'cancelled', from: { customer: ACTIVE, merchant: ['confirmed'], admin: ACTIVE } },
  expire: { to: 'expired', from: { system: AWAITING_RESPONSE } },
  // Completion and no-show are P1 (BKG-09) and limited to merchants and admins.
  complete: { to: 'completed', from: { merchant: ['confirmed'], admin: ['confirmed'] } },
  mark_no_show: { to: 'no_show', from: { merchant: ['confirmed'], admin: ['confirmed'] } },
}

export const bookingActions = Object.keys(bookingTransitions) as BookingAction[]

export class BookingTransitionError extends Error {
  readonly status: BookingStatus
  readonly action: BookingAction
  readonly actor: BookingActor

  constructor(status: BookingStatus, action: BookingAction, actor: BookingActor) {
    super(`This booking can no longer be changed that way (${bookingStatusMeta[status].label}).`)
    this.name = 'BookingTransitionError'
    this.status = status
    this.action = action
    this.actor = actor
  }
}

export function canTransition(status: BookingStatus, action: BookingAction, actor: BookingActor) {
  return bookingTransitions[action].from[actor]?.includes(status) ?? false
}

/** The next status, or throws `BookingTransitionError` when the actor may not do this now. */
export function transition(status: BookingStatus, action: BookingAction, actor: BookingActor): BookingStatus {
  if (!canTransition(status, action, actor)) throw new BookingTransitionError(status, action, actor)
  return bookingTransitions[action].to
}

/** Actions `actor` can take on a booking in `status`, in the order the UI should offer them. */
export function availableActions(status: BookingStatus, actor: BookingActor): BookingAction[] {
  return bookingActions.filter((action) => canTransition(status, action, actor))
}

/** Every status reachable in one step by anyone. */
export function nextStatuses(status: BookingStatus): BookingStatus[] {
  const reachable = new Set<BookingStatus>()
  for (const action of bookingActions) {
    const rule = bookingTransitions[action]
    if (Object.values(rule.from).some((states) => states.includes(status))) reachable.add(rule.to)
  }
  return [...reachable]
}

/** Declined, cancelled, completed, no-show and expired bookings are closed. */
export function isTerminal(status: BookingStatus) {
  return nextStatuses(status).length === 0
}

export function isActive(status: BookingStatus): status is (typeof ACTIVE)[number] {
  return (ACTIVE as readonly BookingStatus[]).includes(status)
}

/** Waiting on someone's answer. These must never be presented as confirmed (doc §7.3). */
export function isAwaitingResponse(status: BookingStatus): status is (typeof AWAITING_RESPONSE)[number] {
  return (AWAITING_RESPONSE as readonly BookingStatus[]).includes(status)
}

/**
 * Tab grouping for "My Bookings" (plan C11): open bookings whose time hasn't
 * passed are upcoming, cancelled ones have their own tab, everything else is past.
 */
export function getBookingTab(booking: Pick<Booking, 'status' | 'end'>, now: Date = new Date()): BookingTab {
  if (booking.status === 'cancelled') return 'cancelled'
  if ((isActive(booking.status) || booking.status === 'draft') && new Date(booking.end) > now) return 'upcoming'
  return 'past'
}

/**
 * When an open request expires: `responseWindowHours` after it was made or
 * `responseCutoffMinutes` before it starts, whichever is earlier (assumption,
 * plan §11.2 #5). Never earlier than the moment it was made.
 */
export function computeRespondBy(createdAt: ISODateTime | Date, start: ISODateTime | Date): ISODateTime {
  const created = new Date(createdAt)
  const windowEnd = addMinutes(created, bookingRules.responseWindowHours * 60)
  const cutoff = addMinutes(start, -bookingRules.responseCutoffMinutes)
  const deadline = Math.max(created.getTime(), Math.min(windowEnd.getTime(), cutoff.getTime()))
  return new Date(deadline).toISOString()
}

/**
 * Earliest start a merchant can propose, in minutes from now. The customer's
 * deadline is `responseCutoffMinutes` before the proposed start, so anything
 * sooner would expire before they could answer.
 */
export const proposalLeadMinutes = bookingRules.minLeadTimeMinutes + bookingRules.responseCutoffMinutes

/** Matches the `Badge` variants, so the UI can pass it straight through. */
export type StatusTone = 'success' | 'warning' | 'info' | 'destructive' | 'secondary' | 'outline'

export interface BookingStatusMeta {
  label: string
  tone: StatusTone
  /** Shown to the customer. */
  customerDescription: string
  /** Shown to the merchant. */
  merchantDescription: string
}

export const bookingStatusMeta: Record<BookingStatus, BookingStatusMeta> = {
  draft: {
    label: 'Draft',
    tone: 'outline',
    customerDescription: 'Not sent yet.',
    merchantDescription: 'The customer hasn’t sent this request.',
  },
  pending: {
    label: 'Pending',
    tone: 'warning',
    customerDescription: 'Waiting for the shop to confirm. This is a request, not a booking yet.',
    merchantDescription: 'Accept, decline or propose another time.',
  },
  alternative_proposed: {
    label: 'New time proposed',
    tone: 'info',
    customerDescription: 'The shop suggested another time. Accept it to confirm your booking.',
    merchantDescription: 'Waiting for the customer to accept your proposed time.',
  },
  confirmed: {
    label: 'Confirmed',
    tone: 'success',
    customerDescription: 'Your appointment is booked.',
    merchantDescription: 'Booked. The customer is expecting you.',
  },
  declined: {
    label: 'Declined',
    tone: 'destructive',
    customerDescription: 'The shop couldn’t take this request. You can request another time.',
    merchantDescription: 'You declined this request.',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'secondary',
    customerDescription: 'This booking was cancelled.',
    merchantDescription: 'This booking was cancelled.',
  },
  completed: {
    label: 'Completed',
    tone: 'secondary',
    customerDescription: 'This appointment is done.',
    merchantDescription: 'Marked as completed.',
  },
  no_show: {
    label: 'No-show',
    tone: 'destructive',
    customerDescription: 'This appointment was marked as missed.',
    merchantDescription: 'Marked as a no-show.',
  },
  expired: {
    label: 'Expired',
    tone: 'outline',
    customerDescription: 'No answer came in time, so this request closed. You can request another time.',
    merchantDescription: 'This request expired before anyone responded.',
  },
}

export const bookingActionLabels: Record<BookingAction, string> = {
  submit: 'Send booking request',
  accept: 'Accept',
  decline: 'Decline',
  propose_alternative: 'Propose another time',
  accept_alternative: 'Accept new time',
  decline_alternative: 'Keep my original time',
  cancel: 'Cancel booking',
  expire: 'Expire',
  complete: 'Mark as completed',
  mark_no_show: 'Mark as no-show',
}
