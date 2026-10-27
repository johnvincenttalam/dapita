import type { Area } from '@/types/catalog'
import type { Coordinates, DateKey, ID, ISODateTime, TimeOfDay } from '@/types/common'

/** 0 = Sunday … 6 = Saturday, matching `Date#getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** One opening window. A `close` at or before `open` runs past midnight. */
export interface TimeRange {
  open: TimeOfDay
  close: TimeOfDay
}

/** Regular opening hours per weekday; an empty list means closed all day. */
export type WeeklyHours = Record<Weekday, TimeRange[]>

/** Full-day closure (holiday, training, renovation) overriding the weekly hours (MER-03). */
export interface ClosurePeriod {
  id: ID
  startDate: DateKey
  /** Inclusive. Equal to `startDate` for a single day. */
  endDate: DateKey
  reason?: string
}

export type BusinessStatus = 'draft' | 'pending_review' | 'changes_requested' | 'approved' | 'suspended' | 'rejected'

/** `request`: the merchant confirms each request (P0 default). `instant`: maintained live calendar (P1). */
export type BookingMethod = 'request' | 'instant'

export interface BusinessPhoto {
  id: ID
  url: string
  alt: string
  kind: 'cover' | 'gallery'
}

/**
 * Free-text policies shown before a customer submits or confirms a booking (BKG-06).
 * The structure (deadlines, fees) is an open question (plan §11.2 #6).
 */
export interface BusinessPolicies {
  cancellation: string
  noShow?: string
  deposit?: string
  /** Stored on each booking so disputes can refer to the policy agreed at the time (doc §11.1). */
  version: number
}

/** Present only when real, moderated reviews exist (doc §9.3, P1). */
export interface RatingSummary {
  average: number
  count: number
}

export interface Business {
  id: ID
  slug: string
  ownerId: ID
  name: string
  description: string
  /** The first entry is the primary category. */
  categoryIds: ID[]
  areaId: ID
  address: string
  coordinates?: Coordinates
  phone?: string
  status: BusinessStatus
  bookingMethod: BookingMethod
  /** Set by an admin after checking verification evidence. Never shown otherwise. */
  verified: boolean
  /** Admin-curated featured placement (ADM-02). */
  featured: boolean
  hours: WeeklyHours
  closures: ClosurePeriod[]
  policies: BusinessPolicies
  photos: BusinessPhoto[]
  rating?: RatingSummary
  /** The admin's latest reason when asking for changes, rejecting or suspending; shown to the owner. */
  moderationNote?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** How a price is quoted; "range" and "quote" exist because many services vary (doc §11). All prices are PHP. */
export type ServicePrice =
  | { type: 'fixed'; amount: number }
  | { type: 'from'; amount: number }
  | { type: 'range'; amount: number; maxAmount: number }
  | { type: 'quote' }

export interface Service {
  id: ID
  businessId: ID
  /** Usually a subcategory, e.g. Facial under Spa & Massage. */
  categoryId: ID
  name: string
  description?: string
  /** What the customer should know or bring (doc §9.1, service detail). */
  requirements?: string
  price: ServicePrice
  durationMinutes: number
  /** Clean-up time after the service, used by live-calendar conflict checks (P1). */
  bufferMinutes: number
  photoUrl?: string
  /** Highlighted by the merchant in "Popular services". Not derived from bookings. */
  featured: boolean
  active: boolean
  sortOrder: number
}

export interface StaffMember {
  id: ID
  businessId: ID
  displayName: string
  title?: string
  avatarUrl?: string
  serviceIds: ID[]
  active: boolean
}

/** A public listing card: what search, home and category pages need without loading every service. */
export interface ShopSummary {
  id: ID
  slug: string
  name: string
  categoryIds: ID[]
  area: Pick<Area, 'id' | 'slug' | 'name'>
  address: string
  coordinates?: Coordinates
  coverPhoto?: BusinessPhoto
  rating?: RatingSummary
  verified: boolean
  featured: boolean
  bookingMethod: BookingMethod
  hours: WeeklyHours
  closures: ClosurePeriod[]
  /** Lowest quoted amount across active services; absent when every service is "price on consultation". */
  priceFrom?: number
  serviceCount: number
}

/** The public shop profile (design screen 5). */
export interface ShopDetails extends Omit<Business, 'ownerId' | 'status' | 'areaId' | 'moderationNote'> {
  area: Pick<Area, 'id' | 'slug' | 'name'>
  priceFrom?: number
  serviceCount: number
}
