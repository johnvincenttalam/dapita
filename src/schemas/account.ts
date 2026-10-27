import { z } from 'zod'

import { emailField, optionalPhMobileField, optionalUrlField, requiredString } from '@/schemas/common'

export const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Berlin', label: 'Central Europe' },
  { value: 'Asia/Manila', label: 'Manila' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
] as const

export const BIO_MAX_LENGTH = 160

export const profileSchema = z.object({
  firstName: requiredString('First name').max(40, 'First name must be 40 characters or fewer'),
  lastName: requiredString('Last name').max(40, 'Last name must be 40 characters or fewer'),
  email: emailField,
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be 24 characters or fewer')
    .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, hyphens and underscores only'),
  bio: z.string().max(BIO_MAX_LENGTH, `Bio must be ${BIO_MAX_LENGTH} characters or fewer`),
  website: optionalUrlField,
  timezone: z.string().min(1, 'Select a timezone'),
})

export type ProfileInput = z.infer<typeof profileSchema>

export const notificationPreferencesSchema = z.object({
  emailDigest: z.enum(['never', 'daily', 'weekly']),
  productUpdates: z.boolean(),
  securityAlerts: z.boolean(),
  mentions: z.boolean(),
  marketing: z.boolean(),
})

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>

/** The customer's own profile (CUS-06). Email changes need re-verification and aren't offered yet. */
export const myProfileSchema = z.object({
  name: requiredString('Your name').max(80, 'Name must be 80 characters or fewer'),
  phone: optionalPhMobileField,
})

export type MyProfileInput = z.input<typeof myProfileSchema>
export type MyProfileValues = z.output<typeof myProfileSchema>
