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

/**
 * Accepts only same-origin, absolute app paths so a crafted `?next=` link
 * can't redirect users to another site after they sign in.
 */
export function getSafeRedirect(next: string | null | undefined): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}
