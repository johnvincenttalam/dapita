import db from '@adonisjs/lucid/services/db'
import Booking from '#models/booking'
import Business from '#models/business'
import Conversation from '#models/conversation'
import ConversationReport from '#models/conversation_report'
import Message from '#models/message'
import SupportCase from '#models/support_case'
import type User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { isMember, requireRole } from '#services/accounts'
import { conversationChanged } from '#services/realtime'
import type {
  ConversationDetails,
  ConversationSide,
  ConversationSummary,
  ID,
  Message as MessageData,
} from '#shared/domain'

/**
 * Customer ↔ shop messaging (MER-05), ported from src/services/conversations.service.ts.
 * The session decides which side you're on; a conversation you're not part of
 * answers 404, so its existence isn't revealed. Every change is pushed live.
 */

const notFound = () => new ApiError('We couldn’t find that conversation.', 404)

async function sideOf(
  user: User,
  conversation: Conversation
): Promise<ConversationSide | undefined> {
  if (conversation.customerId === user.id) return 'customer'
  if (await isMember(user, conversation.businessId)) return 'business'
  return undefined
}

async function findForViewer(user: User, id: ID) {
  const conversation = await Conversation.find(id)
  const side = conversation ? await sideOf(user, conversation) : undefined
  if (!conversation || !side) throw notFound()
  return { conversation, side }
}

export function toMessageData(message: Message): MessageData {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderRole: message.senderRole,
    body: message.body,
    sentAt: message.sentAt,
    readAt: message.readAt ?? undefined,
  }
}

async function toSummaries(
  conversations: Conversation[],
  side: ConversationSide
): Promise<ConversationSummary[]> {
  if (!conversations.length) return []
  const [businesses, bookings, messages] = await Promise.all([
    Business.query().whereIn('id', [...new Set(conversations.map((c) => c.businessId))]),
    Booking.query().whereIn(
      'id',
      conversations.flatMap((c) => (c.bookingId ? [c.bookingId] : []))
    ),
    Message.query()
      .whereIn(
        'conversationId',
        conversations.map((c) => c.id)
      )
      .orderBy('sentAt', 'asc'),
  ])
  return conversations
    .map((conversation) => {
      const business = businesses.find((candidate) => candidate.id === conversation.businessId)
      const booking = bookings.find((candidate) => candidate.id === conversation.bookingId)
      const thread = messages.filter((message) => message.conversationId === conversation.id)
      const last = thread.at(-1)
      return {
        id: conversation.id,
        viewerSide: side,
        business: {
          id: conversation.businessId,
          slug: business?.slug ?? '',
          name: business?.name ?? 'A business',
          coverPhotoUrl: business?.coverPhoto?.url,
        },
        customer: { id: conversation.customerId, name: conversation.customerName },
        booking: booking
          ? {
              id: booking.id,
              serviceName: booking.service.name,
              start: booking.start,
              status: booking.status,
            }
          : undefined,
        lastMessage: last
          ? { body: last.body, sentAt: last.sentAt, senderRole: last.senderRole }
          : undefined,
        unreadCount: thread.filter((message) => message.senderRole !== side && !message.readAt)
          .length,
        reported: Boolean(conversation.reportedAt),
        lastMessageAt: conversation.lastMessageAt,
      }
    })
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
}

async function toSummary(conversation: Conversation, side: ConversationSide) {
  const [summary] = await toSummaries([conversation], side)
  return summary
}

/** Marks the other side's messages as read by `side`. */
async function markOthersRead(conversationId: ID, side: ConversationSide, now: string) {
  return Message.query()
    .where('conversationId', conversationId)
    .whereNot('senderRole', side)
    .whereNull('readAt')
    .update({ readAt: now })
}

export async function listMyConversations(user: User) {
  const conversations = await Conversation.query().where('customerId', user.id)
  return toSummaries(conversations, 'customer')
}

export async function listBusinessConversations(businessId: ID) {
  const conversations = await Conversation.query().where('businessId', businessId)
  return toSummaries(conversations, 'business')
}

/** Opens the customer's thread with a shop, creating it the first time. */
export async function startConversation(user: User, input: { businessId: ID; bookingId?: ID }) {
  requireRole(user, ['customer'], 'Only customer accounts can message shops.')
  if (await isMember(user, input.businessId))
    throw new ApiError('You can’t message your own business.', 422)
  const business = await Business.query()
    .where({ id: input.businessId, status: 'approved' })
    .first()
  if (!business) throw new ApiError('This shop isn’t available for messages.', 404)
  if (input.bookingId) {
    const booking = await Booking.find(input.bookingId)
    if (!booking || booking.customerId !== user.id || booking.businessId !== business.id) {
      throw new ApiError('That booking isn’t one of yours with this shop.', 422)
    }
  }

  let conversation = await Conversation.query()
    .where({ customerId: user.id, businessId: business.id })
    .first()
  if (!conversation) {
    const now = new Date().toISOString()
    conversation = await Conversation.create({
      id: newId('conv'),
      customerId: user.id,
      customerName: user.name,
      businessId: business.id,
      bookingId: input.bookingId ?? null,
      createdAt: now,
      lastMessageAt: now,
      reportedAt: null,
    })
  } else if (input.bookingId) {
    conversation.bookingId = input.bookingId
    await conversation.save()
  }
  conversationChanged(conversation)
  return toSummary(conversation, 'customer')
}

export async function getConversation(user: User, id: ID): Promise<ConversationDetails> {
  const { conversation, side } = await findForViewer(user, id)
  const messages = await Message.query().where('conversationId', id).orderBy('sentAt', 'asc')
  return { ...(await toSummary(conversation, side)), messages: messages.map(toMessageData) }
}

export async function sendMessage(user: User, id: ID, body: string) {
  const { conversation, side } = await findForViewer(user, id)
  const now = new Date().toISOString()
  const message = await db.transaction(async (trx) => {
    const created = await Message.create(
      {
        id: newId('msg'),
        conversationId: id,
        senderId: user.id,
        senderRole: side,
        body,
        sentAt: now,
        readAt: null,
      },
      { client: trx }
    )
    conversation.lastMessageAt = now
    await conversation.useTransaction(trx).save()
    return created
  })
  // Replying means you've seen what came before.
  await markOthersRead(id, side, now)
  conversationChanged(conversation)
  return toMessageData(message)
}

export async function markRead(user: User, id: ID) {
  const { conversation, side } = await findForViewer(user, id)
  const updated = await markOthersRead(id, side, new Date().toISOString())
  // Only worth a push when something changed; read receipts update the sender's screen.
  if (Number(updated) > 0) conversationChanged(conversation)
}

export async function reportConversation(user: User, id: ID, reason: string) {
  const { conversation, side } = await findForViewer(user, id)
  const now = new Date().toISOString()
  await db.transaction(async (trx) => {
    await ConversationReport.create(
      {
        id: newId('rpt'),
        conversationId: id,
        reporterId: user.id,
        reporterSide: side,
        reason,
        createdAt: now,
      },
      { client: trx }
    )
    conversation.reportedAt ??= now
    await conversation.useTransaction(trx).save()

    // One case per conversation while it's being handled; a further report adds to it (ADM-03).
    const event = { id: newId('cev'), actorName: user.name, text: reason, at: now }
    const active = await SupportCase.query({ client: trx })
      .where('conversationId', id)
      .whereNot('status', 'resolved')
      .first()
    if (active) {
      active.events = [...active.events, { ...event, kind: 'reported_again' }]
      active.updatedAt = now
      await active.save()
    } else {
      await SupportCase.create(
        {
          id: newId('case'),
          conversationId: id,
          status: 'open',
          ownerId: null,
          ownerName: null,
          events: [{ ...event, kind: 'opened' }],
          createdAt: now,
          updatedAt: now,
        },
        { client: trx }
      )
    }
  })
  conversationChanged(conversation)
}
