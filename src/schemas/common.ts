import { z } from 'zod'

// Reusable field schemas. Compose these into form schemas so the same rule
// produces the same message everywhere.

export const requiredString = (label: string) => z.string().trim().min(1, `${label} is required`)

export const emailField = z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address'))

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/i, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number')

export const optionalUrlField = z.union([
  z.literal(''),
  z.url({ protocol: /^https?$/, error: 'Enter a valid URL starting with http:// or https://' }),
])

/** Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX (spaces and dashes allowed). */
export const phMobileField = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^(09|\+639)\d{9}$/, 'Enter a mobile number like 0917 123 4567'))

export const optionalPhMobileField = z.union([z.literal(''), phMobileField])

/** Calendar date `YYYY-MM-DD`. */
export const dateKeyField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')

/** Wall-clock time `HH:mm`; `24:00` is allowed as a closing time. */
export const timeOfDayField = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, 'Choose a time')
