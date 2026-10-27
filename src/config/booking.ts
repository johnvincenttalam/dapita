/**
 * Booking rules the documentation leaves open. Every value here is an
 * ASSUMPTION recorded in docs/implementation-plan.md §11.2 #5 and §13; change it
 * here when the product owner decides. The server remains the authority.
 */
export const bookingRules = {
  /** A request expires if the merchant hasn't responded within this many hours… */
  responseWindowHours: 24,
  /** …or this many minutes before the requested start, whichever comes first. */
  responseCutoffMinutes: 60,
  /** Earliest preferred time a customer can pick, measured from now. */
  minLeadTimeMinutes: 60,
  /** How far ahead a customer can request. */
  bookingWindowDays: 30,
  /** Spacing of the preferred-time grid in request mode (design screen 6). */
  slotStepMinutes: 30,
  notesMaxLength: 500,
  reasonMaxLength: 300,
} as const
