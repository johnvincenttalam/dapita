/** Roles from the project documentation (§4.1). Authorization is always enforced by the server. */
export type UserRole = 'customer' | 'merchant_owner' | 'merchant_staff' | 'admin' | 'support'

export interface BusinessMembership {
  businessId: string
  businessName: string
  role: 'owner' | 'staff'
}

export interface SessionUser {
  id: string
  name: string
  email: string
  roles: UserRole[]
  /** Businesses this user can manage in the merchant dashboard. */
  memberships: BusinessMembership[]
  /** Whether the email address has been confirmed (plan §8, item 6). */
  emailVerified: boolean
}

/** Which sign-up flow created the account: customer, or business owner (MER-01). */
export type AccountType = 'customer' | 'business'

/** `null` means signed out. */
export type Session = SessionUser | null
