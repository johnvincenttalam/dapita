import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { hasAnyRole } from '@/lib/roles'
import { messageSchema, reportSchema } from '@/schemas/message'
import { readMockDb, updateMockDb, type MockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { createMockId, delay } from '@/services/mock/utils'
import type { SessionUser } from '@/types/auth'
import type { ID } from '@/types/common'
import type { Conversation, ConversationDetails, ConversationSide, ConversationSummary, Message } from '@/types/message'

export interface StartConversationInput {
  businessId: ID
  /** The booking the customer is asking about, shown to the shop as context. */
  bookingId?: ID
}

export interface ConversationsService {
  // Customer
  listMyConversations: () => Promise<ConversationSummary[]>
  /** Opens the customer's thread with a shop, creating it the first time. */
  startConversation: (input: StartConversationInput) => Promise<ConversationSummary>
  // Merchant
  listBusinessConversations: (businessId: ID) => Promise<ConversationSummary[]>
  // Either side
  getConversation: (id: ID) => Promise<ConversationDetails>
  sendMessage: (id: ID, body: string) => Promise<Message>
  /** Marks the other side's messages as read by the viewer. */
  markRead: (id: ID) => Promise<void>
  reportConversation: (id: ID, reason: string) => Promise<void>
}

// Endpoints from docs/implementation-plan.md §7.3.
const conversationPath = (id: ID) => `/conversations/${encodeURIComponent(id)}`

const httpConversationsService: ConversationsService = {
  listMyConversations: () => apiClient.get<ConversationSummary[]>('/conversations'),
  startConversation: (input) => apiClient.post<ConversationSummary>('/conversations', input),
  listBusinessConversations: (businessId) =>
    apiClient.get<ConversationSummary[]>(`/merchant/businesses/${encodeURIComponent(businessId)}/conversations`),
  getConversation: (id) => apiClient.get<ConversationDetails>(conversationPath(id)),
  sendMessage: (id, body) => apiClient.post<Message>(`${conversationPath(id)}/messages`, { body }),
  markRead: (id) => apiClient.post<void>(`${conversationPath(id)}/read`),
  reportConversation: (id, reason) => apiClient.post<void>(`${conversationPath(id)}/report`, { reason }),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// The session decides which side you're on. A conversation you're not part of
// answers 404, so its existence isn't revealed.

const notFound = () => new ApiError('We couldn’t find that conversation.', 404)

function requireUser() {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  return user
}

const isMember = (user: SessionUser, businessId: ID) =>
  user.memberships.some((membership) => membership.businessId === businessId)

function sideOf(user: SessionUser, conversation: Conversation): ConversationSide | undefined {
  if (conversation.customerId === user.id) return 'customer'
  if (isMember(user, conversation.businessId)) return 'business'
  return undefined
}

function findForViewer(db: MockDb, user: SessionUser, id: ID) {
  const conversation = db.conversations.find((candidate) => candidate.id === id)
  const side = conversation && sideOf(user, conversation)
  if (!conversation || !side) throw notFound()
  return { conversation, side }
}

const messagesOf = (db: MockDb, id: ID) =>
  db.messages.filter((message) => message.conversationId === id).sort((a, b) => a.sentAt.localeCompare(b.sentAt))

function toSummary(db: MockDb, conversation: Conversation, side: ConversationSide): ConversationSummary {
  const business = db.businesses.find((candidate) => candidate.id === conversation.businessId)
  const booking = conversation.bookingId
    ? db.bookings.find((candidate) => candidate.id === conversation.bookingId)
    : undefined
  const messages = messagesOf(db, conversation.id)
  const last = messages.at(-1)
  return {
    id: conversation.id,
    viewerSide: side,
    business: {
      id: conversation.businessId,
      slug: business?.slug ?? '',
      name: business?.name ?? 'A business',
      coverPhotoUrl: business?.photos.find((photo) => photo.kind === 'cover')?.url,
    },
    customer: { id: conversation.customerId, name: conversation.customerName },
    booking: booking
      ? { id: booking.id, serviceName: booking.service.name, start: booking.start, status: booking.status }
      : undefined,
    lastMessage: last ? { body: last.body, sentAt: last.sentAt, senderRole: last.senderRole } : undefined,
    unreadCount: messages.filter((message) => message.senderRole !== side && !message.readAt).length,
    reported: Boolean(conversation.reportedAt),
    lastMessageAt: conversation.lastMessageAt,
  }
}

const newestFirst = (a: ConversationSummary, b: ConversationSummary) => b.lastMessageAt.localeCompare(a.lastMessageAt)

function validate<T>(
  result: { success: true; data: T } | { success: false; error: { issues: { message: string }[] } },
) {
  if (!result.success) throw new ApiError(result.error.issues[0]?.message ?? 'Check the message.', 422)
  return result.data
}

const mockConversationsService: ConversationsService = {
  async listMyConversations() {
    await delay(300)
    const user = requireUser()
    const db = readMockDb()
    return db.conversations
      .filter((conversation) => conversation.customerId === user.id)
      .map((conversation) => toSummary(db, conversation, 'customer'))
      .sort(newestFirst)
  },

  async startConversation({ businessId, bookingId }) {
    await delay(350)
    const user = requireUser()
    if (!hasAnyRole(user, ['customer'])) throw new ApiError('Only customer accounts can message shops.', 403)
    if (isMember(user, businessId)) throw new ApiError('You can’t message your own business.', 422)
    return updateMockDb((db) => {
      const business = db.businesses.find((candidate) => candidate.id === businessId && candidate.status === 'approved')
      if (!business) throw new ApiError('This shop isn’t available for messages.', 404)
      if (bookingId) {
        const booking = db.bookings.find((candidate) => candidate.id === bookingId)
        if (!booking || booking.customerId !== user.id || booking.businessId !== businessId) {
          throw new ApiError('That booking isn’t one of yours with this shop.', 422)
        }
      }
      let conversation = db.conversations.find(
        (candidate) => candidate.customerId === user.id && candidate.businessId === businessId,
      )
      if (!conversation) {
        const now = new Date().toISOString()
        conversation = {
          id: createMockId('conv'),
          customerId: user.id,
          customerName: user.name,
          businessId,
          createdAt: now,
          lastMessageAt: now,
        }
        db.conversations.push(conversation)
      }
      if (bookingId) conversation.bookingId = bookingId
      return toSummary(db, conversation, 'customer')
    })
  },

  async listBusinessConversations(businessId) {
    await delay(300)
    const user = requireUser()
    if (!isMember(user, businessId)) throw new ApiError('You don’t have access to this business.', 403)
    const db = readMockDb()
    return db.conversations
      .filter((conversation) => conversation.businessId === businessId)
      .map((conversation) => toSummary(db, conversation, 'business'))
      .sort(newestFirst)
  },

  async getConversation(id) {
    await delay(250)
    const user = requireUser()
    const db = readMockDb()
    const { conversation, side } = findForViewer(db, user, id)
    return { ...toSummary(db, conversation, side), messages: messagesOf(db, id) }
  },

  async sendMessage(id, body) {
    await delay(300)
    const user = requireUser()
    const valid = validate(messageSchema.safeParse({ body }))
    return updateMockDb((db) => {
      const { conversation, side } = findForViewer(db, user, id)
      const now = new Date().toISOString()
      const message: Message = {
        id: createMockId('msg'),
        conversationId: id,
        senderId: user.id,
        senderRole: side,
        body: valid.body,
        sentAt: now,
      }
      db.messages.push(message)
      conversation.lastMessageAt = now
      // Replying means you've seen what came before.
      for (const other of messagesOf(db, id)) if (other.senderRole !== side && !other.readAt) other.readAt = now
      return structuredClone(message)
    })
  },

  async markRead(id) {
    await delay(100)
    const user = requireUser()
    updateMockDb((db) => {
      const { side } = findForViewer(db, user, id)
      const now = new Date().toISOString()
      for (const message of messagesOf(db, id)) if (message.senderRole !== side && !message.readAt) message.readAt = now
    })
  },

  async reportConversation(id, reason) {
    await delay(400)
    const user = requireUser()
    const valid = validate(reportSchema.safeParse({ reason }))
    updateMockDb((db) => {
      const { conversation, side } = findForViewer(db, user, id)
      const now = new Date().toISOString()
      db.conversationReports.push({
        id: createMockId('rpt'),
        conversationId: id,
        reporterId: user.id,
        reporterSide: side,
        reason: valid.reason,
        createdAt: now,
      })
      conversation.reportedAt ??= now
      // One case per conversation while it's being handled; a further report adds to it (ADM-03).
      const event = { id: createMockId('cev'), actorName: user.name, text: valid.reason, at: now }
      const active = db.supportCases.find((item) => item.conversationId === id && item.status !== 'resolved')
      if (active) {
        active.events.push({ ...event, kind: 'reported_again' })
        active.updatedAt = now
      } else {
        db.supportCases.push({
          id: createMockId('case'),
          kind: 'message',
          conversationId: id,
          businessId: conversation.businessId,
          reporterId: user.id,
          reporterSide: side,
          status: 'open',
          createdAt: now,
          updatedAt: now,
          events: [{ ...event, kind: 'opened' }],
        })
      }
    })
  },
}

export const conversationsService: ConversationsService = env.useMocks
  ? mockConversationsService
  : httpConversationsService
