import { addMinutes } from '@/lib/datetime'
import { mockUsers } from '@/services/mock/users'
import type { Business } from '@/types/business'
import type { SupportCase } from '@/types/admin'
import type { Conversation, ConversationReport, ConversationSide, Message } from '@/types/message'
import type { ID } from '@/types/common'

// MOCK: a few threads relative to "now", about the seeded bookings, so both inboxes
// have something to read and answer. Names and messages are fictional.

interface ConversationSeed {
  id: ID
  customer: { id: ID; name: string }
  businessId: ID
  bookingId?: ID
  /** [who, hours ago, text, read by the other side] */
  messages: [ConversationSide, number, string, boolean][]
  /** Reported by the customer this many hours ago, with this reason: seeds an open support case. */
  report?: { hoursAgo: number; reason: string }
}

const andrea = { id: mockUsers.customer.id, name: mockUsers.customer.name }

const seeds: ConversationSeed[] = [
  {
    id: 'conv_andrea_goodcut',
    customer: andrea,
    businessId: 'biz_good_cut',
    bookingId: 'bk_andrea_pending',
    messages: [
      ['customer', 2.9, 'Hi! I sent a request for Friday. Is Ken good with layers on shoulder-length hair?', false],
    ],
  },
  {
    id: 'conv_andrea_serenity',
    customer: andrea,
    businessId: 'biz_serenity',
    bookingId: 'bk_andrea_alternative',
    messages: [
      ['customer', 19.5, 'Hello, can I request a female therapist for the Swedish massage?', true],
      ['business', 9, 'Hi Andrea! Yes, Joy will look after you. 6 PM is full, so we suggested 7:30 PM instead.', false],
    ],
  },
  {
    id: 'conv_bea_polished',
    customer: { id: 'usr_bea', name: 'Bea Villanueva' },
    businessId: 'biz_polished',
    messages: [
      ['customer', 30, 'Hi! How much is a gel manicure with simple nail art?', true],
      ['business', 29, '₱650. To hold a slot, send a ₱300 deposit to my GCash, 0917 555 0102.', true],
      ['customer', 28, 'Is that allowed? The app says no payment is taken through Dapita.', false],
    ],
    report: { hoursAgo: 27.5, reason: 'The shop asked me to send a deposit to a personal GCash number.' },
  },
  {
    id: 'conv_carlos_goodcut',
    customer: { id: 'usr_carlos', name: 'Carlos Tan' },
    businessId: 'biz_good_cut',
    messages: [
      ['customer', 26, 'Do you do hair colour for men?', true],
      ['business', 25, 'We do! Men’s Hair Color starts at ₱800, depending on length.', true],
      ['customer', 20, 'Great, I’ll book after payday. Do you have parking?', false],
    ],
  },
]

export function createSeedConversations(now: Date, businesses: Business[]) {
  const conversations: Conversation[] = []
  const messages: Message[] = []
  const reports: ConversationReport[] = []
  const cases: SupportCase[] = []
  for (const seed of seeds) {
    const business = businesses.find((candidate) => candidate.id === seed.businessId)
    if (!business) throw new Error(`Invalid conversation seed ${seed.id}`)
    const sent = seed.messages.map(([side, hoursAgo, body, read], index) => {
      const sentAt = addMinutes(now, -hoursAgo * 60)
      return {
        id: `${seed.id}_m${index + 1}`,
        conversationId: seed.id,
        senderId: side === 'customer' ? seed.customer.id : business.ownerId,
        senderRole: side,
        body,
        sentAt: sentAt.toISOString(),
        ...(read ? { readAt: addMinutes(sentAt, 20).toISOString() } : {}),
      } satisfies Message
    })
    messages.push(...sent)
    conversations.push({
      id: seed.id,
      customerId: seed.customer.id,
      customerName: seed.customer.name,
      businessId: seed.businessId,
      ...(seed.bookingId ? { bookingId: seed.bookingId } : {}),
      createdAt: sent[0]?.sentAt ?? now.toISOString(),
      lastMessageAt: sent.at(-1)?.sentAt ?? now.toISOString(),
      ...(seed.report ? { reportedAt: addMinutes(now, -seed.report.hoursAgo * 60).toISOString() } : {}),
    })
    if (seed.report) {
      const at = addMinutes(now, -seed.report.hoursAgo * 60).toISOString()
      reports.push({
        id: `${seed.id}_report`,
        conversationId: seed.id,
        reporterId: seed.customer.id,
        reporterSide: 'customer',
        reason: seed.report.reason,
        createdAt: at,
      })
      cases.push({
        id: `case_${seed.id}`,
        kind: 'message',
        conversationId: seed.id,
        businessId: seed.businessId,
        reporterId: seed.customer.id,
        reporterSide: 'customer',
        status: 'open',
        createdAt: at,
        updatedAt: at,
        events: [
          { id: `case_${seed.id}_ev1`, kind: 'opened', actorName: seed.customer.name, text: seed.report.reason, at },
        ],
      })
    }
  }
  return { conversations, messages, reports, cases }
}
