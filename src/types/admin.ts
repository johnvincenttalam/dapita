import type { UserRole } from '@/types/auth'
import type { BookingStatus } from '@/types/booking'
import type { Business, BusinessStatus, Service } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'
import type { ID, ISODateTime } from '@/types/common'
import type { ConversationSide, Message } from '@/types/message'

/** Admin decisions on a listing (ADM-01). Each one is recorded with who, when and why. */
export type ModerationActionType = 'approve' | 'request_changes' | 'reject' | 'suspend' | 'reinstate'

export interface ModerationAction {
  id: ID
  businessId: ID
  action: ModerationActionType
  from: BusinessStatus
  to: BusinessStatus
  reason: string
  actorId: ID
  actorName: string
  at: ISODateTime
}

/** A listing in the admin lists. */
export interface MerchantListItem {
  id: ID
  slug: string
  name: string
  status: BusinessStatus
  areaName: string
  categoryNames: string[]
  ownerName: string
  serviceCount: number
  /** Admin-curated placement on the home page (ADM-02). */
  featured: boolean
  updatedAt: ISODateTime
}

export interface MerchantReview {
  business: Business
  areaName: string
  categoryNames: string[]
  services: Service[]
  owner: { id: ID; name: string; email?: string }
  /** Newest first. */
  history: ModerationAction[]
  availableActions: ModerationActionType[]
}

export type CaseStatus = 'open' | 'in_progress' | 'resolved'

export interface CaseEvent {
  id: ID
  kind: 'opened' | 'reported_again' | 'taken' | 'note' | 'resolved'
  actorName: string
  text?: string
  at: ISODateTime
}

/**
 * Where a case came from: a reported conversation (`message`), or a request sent
 * from the support page about a booking, a shop's listing, the sender's own
 * account or data, or anything else.
 */
export type CaseKind = 'message' | 'booking' | 'listing' | 'account' | 'other'

/** A support case (ADM-03). */
export interface SupportCase {
  id: ID
  kind: CaseKind
  /** `message` cases: the reported conversation. */
  conversationId?: ID
  /** `listing` cases, and `booking` cases about a booking: the shop it's about. */
  businessId?: ID
  bookingId?: ID
  /** Who opened it. A reported conversation keeps its first reporter here. */
  reporterId: ID
  reporterSide: ConversationSide
  status: CaseStatus
  ownerId?: ID
  ownerName?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  /** Oldest first: the audit trail. */
  events: CaseEvent[]
}

export interface CaseListItem {
  id: ID
  kind: CaseKind
  status: CaseStatus
  ownerName?: string
  /** The latest report's reason, or what the sender wrote. */
  reason: string
  /** Who sent the latest report or the request. */
  reporterName: string
  reporterSide: ConversationSide
  conversationId?: ID
  /** `message` cases: the customer in the conversation. */
  customerName?: string
  businessId?: ID
  businessName?: string
  bookingId?: ID
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface CaseDetails extends CaseListItem {
  /** Where to reply. Missing once the sender's account is gone. */
  reporterEmail?: string
  events: CaseEvent[]
  /** `message` cases: the conversation as it happened. Empty otherwise. */
  messages: Message[]
  booking?: { reference: string; serviceName: string; start: ISODateTime; status: BookingStatus }
}

/** A category in the admin taxonomy editor, with how much uses it (ADM-02). */
export interface AdminCategory extends ServiceCategory {
  /** Listings filed under it (top-level categories). */
  shopCount: number
  /** Services filed under it (subcategories). */
  serviceCount: number
}

export interface AccountAction {
  action: 'suspend' | 'reinstate'
  reason: string
  actorName: string
  at: ISODateTime
}

/** An account as user lookup shows it. */
export interface AdminUser {
  id: ID
  name: string
  email: string
  roles: UserRole[]
  businessNames: string[]
  emailVerified: boolean
  createdAt: ISODateTime
  suspended: boolean
  suspendedReason?: string
  /** Newest first. */
  history: AccountAction[]
}
