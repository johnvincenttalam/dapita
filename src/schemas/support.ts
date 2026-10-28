import { z } from 'zod'

/** What a support request can be about. Reported conversations open cases from the inbox instead. */
export const supportTopics = ['booking', 'listing', 'account', 'other'] as const

export type SupportTopic = (typeof supportTopics)[number]

/** A request sent from the support page (ADM-03, doc §13.2 data requests, §13.4 listing reports). */
export const supportRequestSchema = z
  .object({
    topic: z.enum(supportTopics, { error: 'Choose what this is about' }),
    /** `booking`: one of the sender's bookings. Optional; the sender may not find it. */
    bookingId: z.string().trim().max(64).optional(),
    /** `listing`: the shop being reported. */
    businessId: z.string().trim().max(64).optional(),
    message: z
      .string()
      .trim()
      .min(10, 'Tell us what happened in at least 10 characters')
      .max(2000, 'Keep this to 2,000 characters or fewer'),
  })
  .refine((input) => input.topic !== 'listing' || Boolean(input.businessId), {
    message: 'Open the shop’s page and choose “Report this listing”',
    path: ['businessId'],
  })

export type SupportRequestInput = z.infer<typeof supportRequestSchema>

/** How many requests one person can have waiting at once, so the queue stays workable. */
export const maxOpenSupportRequests = 5
