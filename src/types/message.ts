import type { BookingStatus } from '@/types/booking'
import type { ID, ISODateTime } from '@/types/common'

/** Which side of a conversation someone is on. Staff and owners all write as the business. */
export type ConversationSide = 'customer' | 'business'

/** One thread between a customer and a business (MER-05). There is at most one per pair. */
export interface Conversation {
  id: ID
  customerId: ID
  /** As the customer gave it, like a booking's contact name. */
  customerName: string
  businessId: ID
  /** The booking the conversation is most recently about, if any. */
  bookingId?: ID
  createdAt: ISODateTime
  lastMessageAt: ISODateTime
  /** Set once anyone reports the conversation; support reviews it (§13.2). */
  reportedAt?: ISODateTime
}

export interface Message {
  id: ID
  conversationId: ID
  senderId: ID
  senderRole: ConversationSide
  body: string
  sentAt: ISODateTime
  /** When the other side opened it. */
  readAt?: ISODateTime
}

export interface ConversationReport {
  id: ID
  conversationId: ID
  reporterId: ID
  reporterSide: ConversationSide
  reason: string
  createdAt: ISODateTime
}

/** A conversation as one viewer sees it in a list. */
export interface ConversationSummary {
  id: ID
  viewerSide: ConversationSide
  business: { id: ID; slug: string; name: string; coverPhotoUrl?: string }
  customer: { id: ID; name: string }
  booking?: { id: ID; serviceName: string; start: ISODateTime; status: BookingStatus }
  lastMessage?: Pick<Message, 'body' | 'sentAt' | 'senderRole'>
  /** Messages from the other side the viewer hasn't opened. */
  unreadCount: number
  reported: boolean
  lastMessageAt: ISODateTime
}

export interface ConversationDetails extends ConversationSummary {
  messages: Message[]
}
