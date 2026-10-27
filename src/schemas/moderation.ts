import { z } from 'zod'

/** Admin listing decisions. Every action records actor, time and reason (ADM-01). */
export const moderationActions = ['approve', 'request_changes', 'reject', 'suspend', 'reinstate'] as const

export const moderationSchema = z.object({
  action: z.enum(moderationActions, { error: 'Choose an action' }),
  reason: z
    .string()
    .trim()
    .min(5, 'Give a reason of at least 5 characters')
    .max(1000, 'Keep the reason to 1,000 characters or fewer'),
})

export type ModerationInput = z.infer<typeof moderationSchema>
