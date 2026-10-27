import { z } from 'zod'

/** A chat message between a customer and a business (MER-05). */
export const messageSchema = z.object({
  body: z.string().trim().min(1, 'Write a message').max(2000, 'Keep messages to 2,000 characters or fewer'),
})

export type MessageInput = z.infer<typeof messageSchema>

/** Reporting a conversation to Dapita support (§13.2). */
export const reportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'Tell us what happened in at least 5 characters')
    .max(500, 'Keep this to 500 characters or fewer'),
})

export type ReportInput = z.infer<typeof reportSchema>
