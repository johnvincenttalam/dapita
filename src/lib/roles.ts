import type { SessionUser, UserRole } from '@/types/auth'

/** Which roles may enter each area of the app. */
export const roleGroups = {
  customer: ['customer'],
  merchant: ['merchant_owner', 'merchant_staff'],
  admin: ['admin', 'support'],
} as const satisfies Record<string, readonly UserRole[]>

export const roleLabels: Record<UserRole, string> = {
  customer: 'Customer',
  merchant_owner: 'Owner',
  merchant_staff: 'Staff',
  admin: 'Administrator',
  support: 'Support',
}

export function hasAnyRole(user: SessionUser | null | undefined, roles: readonly UserRole[]): boolean {
  return Boolean(user?.roles.some((role) => roles.includes(role)))
}

/** Where a user lands after signing in when no `next` path was requested. */
export function defaultPathFor(user: SessionUser): string {
  if (hasAnyRole(user, roleGroups.admin)) return '/admin'
  if (hasAnyRole(user, roleGroups.merchant)) return '/business'
  return '/'
}

/** The roles an app path needs, by area. Undefined when any signed-in user may open it. */
function rolesForPath(path: string): readonly UserRole[] | undefined {
  const pathname = path.split(/[?#]/)[0] ?? path
  const within = (area: string) => pathname === area || pathname.startsWith(`${area}/`)
  // Business sign-up sits under /business but is open to everyone.
  if (pathname === '/business/sign-up') return undefined
  if (within('/business')) return roleGroups.merchant
  if (within('/admin')) return roleGroups.admin
  return undefined
}

/**
 * Where to send a user who just signed in, signed up or verified their email: the
 * requested `next` path if their account can open it, else their own home. A guest
 * who opened a business page and then created a customer account lands on the
 * marketplace, not on "You don’t have access".
 */
export function landingPathFor(user: SessionUser, next: string | null | undefined): string {
  const safe = getSafeRedirect(next)
  if (!safe) return defaultPathFor(user)
  const roles = rolesForPath(safe)
  return !roles || hasAnyRole(user, roles) ? safe : defaultPathFor(user)
}

/**
 * Accepts only same-origin, absolute app paths so a crafted `?next=` link
 * can't redirect users to another site after they sign in.
 */
export function getSafeRedirect(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}
