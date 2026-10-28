import vine from '@vinejs/vine'

// Moderation goes through the SPA's moderationSchema (`validateWith`); notes, reasons
// and category names keep the mock's own messages (`requireText`, admin_categories).

export const directionValidator = vine.create({
  direction: vine.enum(['up', 'down'] as const),
})

export const featuredValidator = vine.create({
  featured: vine.boolean({ strict: true }),
})

export const userSearchValidator = vine.create({
  q: vine.string().trim().maxLength(100).optional(),
})
