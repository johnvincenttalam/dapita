import { z } from 'zod'

import { parseTimeOfDay } from '@/lib/datetime'
import { dateKeyField, optionalPhMobileField, requiredString, timeOfDayField } from '@/schemas/common'

// Merchant business profile, hours and policies (MER-01, MER-03, BKG-06).

/** Overnight hours aren't offered in the form; close a day at `24:00` instead. */
export const timeRangeSchema = z
  .object({ open: timeOfDayField, close: timeOfDayField })
  .refine((range) => parseTimeOfDay(range.close) > parseTimeOfDay(range.open), {
    path: ['close'],
    error: 'Closing time must be after opening time',
  })

/** One day's opening windows, earliest first or not; they may not overlap. */
export const dayHoursSchema = z.array(timeRangeSchema).refine(
  (ranges) => {
    const sorted = ranges.toSorted((a, b) => parseTimeOfDay(a.open) - parseTimeOfDay(b.open))
    return sorted.every((range, index) => {
      const next = sorted[index + 1]
      return !next || parseTimeOfDay(range.close) <= parseTimeOfDay(next.open)
    })
  },
  { error: 'Opening times on the same day can’t overlap' },
)

export const weeklyHoursSchema = z.object({
  0: dayHoursSchema,
  1: dayHoursSchema,
  2: dayHoursSchema,
  3: dayHoursSchema,
  4: dayHoursSchema,
  5: dayHoursSchema,
  6: dayHoursSchema,
})

export const closureSchema = z
  .object({
    startDate: dateKeyField,
    endDate: dateKeyField,
    reason: z.string().trim().max(120, 'Keep the reason to 120 characters or fewer'),
  })
  .refine((closure) => closure.endDate >= closure.startDate, {
    path: ['endDate'],
    error: 'End date can’t be before the start date',
  })

export type ClosureInput = z.infer<typeof closureSchema>

export const policiesSchema = z.object({
  cancellation: requiredString('Cancellation policy')
    .min(20, 'Explain the cancellation rules in at least 20 characters')
    .max(1000, 'Keep the policy to 1,000 characters or fewer'),
  noShow: z.string().trim().max(1000, 'Keep the policy to 1,000 characters or fewer'),
  deposit: z.string().trim().max(1000, 'Keep the policy to 1,000 characters or fewer'),
})

export type PoliciesInput = z.infer<typeof policiesSchema>

export const businessProfileSchema = z.object({
  name: requiredString('Business name').max(80, 'Keep the name to 80 characters or fewer'),
  description: requiredString('Description')
    .min(20, 'Describe your business in at least 20 characters')
    .max(1000, 'Keep the description to 1,000 characters or fewer'),
  categoryIds: z.array(z.string()).min(1, 'Choose at least one category').max(3, 'Choose up to 3 categories'),
  areaId: requiredString('Area'),
  address: requiredString('Address').max(200, 'Keep the address to 200 characters or fewer'),
  phone: optionalPhMobileField,
})

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>
