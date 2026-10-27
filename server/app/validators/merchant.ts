import vine from '@vinejs/vine'

// Profile, hours, closures, policies and services are checked with the SPA's own
// form schemas (`validateWith`); these cover the requests that have no form schema.

export const moveServiceValidator = vine.create({
  direction: vine.enum(['up', 'down'] as const),
})

export const notificationSettingsValidator = vine.create({
  newRequest: vine.boolean({ strict: true }),
  requestExpiring: vine.boolean({ strict: true }),
  newMessage: vine.boolean({ strict: true }),
  dailySummary: vine.boolean({ strict: true }),
})
