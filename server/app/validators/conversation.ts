import vine from '@vinejs/vine'

export const startConversationValidator = vine.create({
  businessId: vine.string(),
  bookingId: vine.string().optional(),
})

/** Same limits as src/schemas/message.ts. */
export const messageValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(2000),
})

export const reportValidator = vine.create({
  reason: vine.string().trim().minLength(5).maxLength(500),
})
