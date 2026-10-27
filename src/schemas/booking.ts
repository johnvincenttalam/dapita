import { z } from 'zod'

import { bookingRules } from '@/config/booking'
import { dateKeyField, optionalPhMobileField, requiredString, timeOfDayField } from '@/schemas/common'

// Client-side checks for the booking flow (BKG-01, BKG-03, BKG-06). Whether a
// time is actually bookable is decided by the server (or the mock service).

const notesField = z
  .string()
  .trim()
  .max(bookingRules.notesMaxLength, `Notes must be ${bookingRules.notesMaxLength} characters or fewer`)

const reasonField = z
  .string()
  .trim()
  .max(bookingRules.reasonMaxLength, `Keep it to ${bookingRules.reasonMaxLength} characters or fewer`)

/** Design screen 6 in request mode: service, optional staff, preferred date and time, notes, policy. */
export const bookingRequestSchema = z.object({
  serviceId: requiredString('Service'),
  /** `null` = any available staff member. */
  staffId: z.string().nullable(),
  date: dateKeyField,
  time: timeOfDayField,
  phone: optionalPhMobileField,
  notes: notesField,
  policyAccepted: z.boolean().refine((value) => value, 'Confirm that you’ve read the cancellation policy'),
})

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>

/** Merchant proposes a different time (BKG-03). */
export const proposeTimeSchema = z.object({
  date: dateKeyField,
  time: timeOfDayField,
  message: reasonField,
})

export type ProposeTimeInput = z.infer<typeof proposeTimeSchema>

/** Optional reason when declining or cancelling; recorded in the booking history (BKG-08). */
export const bookingReasonSchema = z.object({ reason: reasonField })

export type BookingReasonInput = z.infer<typeof bookingReasonSchema>
