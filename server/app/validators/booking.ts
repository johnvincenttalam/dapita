import vine from '@vinejs/vine'
import { bookingRules } from '#shared/domain'

const isoDateTime = () => vine.string().trim()
const reason = () => vine.string().trim().maxLength(bookingRules.reasonMaxLength).optional()

export const createBookingValidator = vine.create({
  serviceId: vine.string(),
  staffId: vine.string().nullable(),
  start: isoDateTime(),
  phone: vine.string().trim().maxLength(20).optional(),
  notes: vine.string().trim().maxLength(bookingRules.notesMaxLength).optional(),
})

export const reasonValidator = vine.create({
  reason: reason(),
})

export const proposeValidator = vine.create({
  start: isoDateTime(),
  message: reason(),
})

export const businessBookingsQueryValidator = vine.create({
  from: isoDateTime().optional(),
  to: isoDateTime().optional(),
  status: vine
    .enum([
      'draft',
      'pending',
      'alternative_proposed',
      'confirmed',
      'declined',
      'cancelled',
      'completed',
      'no_show',
      'expired',
    ] as const)
    .optional(),
})
