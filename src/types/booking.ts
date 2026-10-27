import type { BookingMethod, ServicePrice } from '@/types/business'
import type { ID, ISODateTime } from '@/types/common'

/** Booking states from doc §7.2. Transitions live in `src/lib/booking-status.ts`. */
export type BookingStatus =
  | 'draft'
  | 'pending'
  | 'alternative_proposed'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'expired'

/** Who performs a transition. `system` covers automatic changes such as expiry. */
export type BookingActor = 'customer' | 'merchant' | 'admin' | 'system'

export type BookingAction =
  | 'submit'
  | 'accept'
  | 'decline'
  | 'propose_alternative'
  | 'accept_alternative'
  | 'decline_alternative'
  | 'cancel'
  | 'expire'
  | 'complete'
  | 'mark_no_show'

/** The customer-facing "My Bookings" tabs (design screen 11). */
export type BookingTab = 'upcoming' | 'past' | 'cancelled'

/** Service details as agreed when the request was made (doc §11.1: price snapshot). */
export interface BookingServiceSnapshot {
  name: string
  durationMinutes: number
  price: ServicePrice
}

export interface BookingContact {
  name: string
  email: string
  phone?: string
}

/** A different time offered by the merchant; the customer must accept it (BKG-03). */
export interface BookingProposal {
  start: ISODateTime
  end: ISODateTime
  message?: string
  proposedAt: ISODateTime
}

export interface Booking {
  id: ID
  /** Short human-readable code for support and the merchant's front desk. */
  reference: string
  customerId: ID
  contact: BookingContact
  businessId: ID
  serviceId: ID
  /** `null` = any available staff member. */
  staffId: ID | null
  /** The requested time, or the agreed time once confirmed. */
  start: ISODateTime
  end: ISODateTime
  proposal?: BookingProposal
  status: BookingStatus
  notes?: string
  bookingMethod: BookingMethod
  service: BookingServiceSnapshot
  /** Version of the business policies shown when the request was submitted. */
  policyVersion: number
  /** Deadline for the merchant (or, with a proposal, the customer) to respond before the request expires. */
  respondBy?: ISODateTime
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Audit trail entry for every state change (BKG-08). */
export interface BookingEvent {
  id: ID
  bookingId: ID
  action: BookingAction
  actor: BookingActor
  /** `null` for system actions. */
  actorId: ID | null
  from: BookingStatus
  to: BookingStatus
  reason?: string
  at: ISODateTime
}

/** A booking with the related records each screen needs, as returned by the bookings service. */
export interface BookingDetails extends Booking {
  business: {
    id: ID
    slug: string
    name: string
    address: string
    areaName: string
    phone?: string
    /** The shop's cover photo, shown on booking cards. */
    coverPhotoUrl?: string
  }
  staffName?: string
  events: BookingEvent[]
}
