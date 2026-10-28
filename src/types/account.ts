import type { ID, ISODateTime } from '@/types/common'

/**
 * What a consent record covers: the documents accepted at sign-up. Plan §7.1 also
 * lists `ai_preview`, added with the AI Style Studio (P1).
 */
export type ConsentPurpose = 'terms' | 'privacy_notice' | 'merchant_policy'

/** A documented acceptance or acknowledgement, kept with the document version (doc §11 ConsentRecord). */
export interface ConsentRecord {
  id: ID
  purpose: ConsentPurpose
  version: string
  grantedAt: ISODateTime
  withdrawnAt?: ISODateTime
}

/** A customer's request to delete their account (CUS-06). Handling is a support process (doc §13.2). */
export interface DeletionRequest {
  id: ID
  requestedAt: ISODateTime
  status: 'received'
}

/** The signed-in user's own account details (customer account page, doc §9.1). */
export interface MyProfile {
  id: ID
  name: string
  email: string
  /** Optional Philippine mobile number. */
  phone?: string
  emailVerified: boolean
  createdAt: ISODateTime
  deletionRequest?: DeletionRequest
}

/** A shop a customer saved to come back to (CUS-07). One per customer and shop. */
export interface Favorite {
  userId: ID
  businessId: ID
  savedAt: ISODateTime
}
