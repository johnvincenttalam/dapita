import type { UserRole } from '@/types/auth'
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

/** A support case (ADM-03). For now every case comes from a reported conversation. */
export interface SupportCase {
  id: ID
  conversationId: ID
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
  conversationId: ID
  status: CaseStatus
  ownerName?: string
  /** The latest report's reason. */
  reason: string
  reporterSide: ConversationSide
  customerName: string
  businessName: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface CaseDetails extends CaseListItem {
  businessId: ID
  events: CaseEvent[]
  messages: Message[]
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
