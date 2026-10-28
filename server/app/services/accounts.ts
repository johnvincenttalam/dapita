import Business from '#models/business'
import BusinessMembership from '#models/business_membership'
import type User from '#models/user'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import ApiError, { noBusinessAccess } from '#exceptions/api_error'
import { hasAnyRole, type ID, type SessionUser, type UserRole } from '#shared/domain'

/**
 * The signed-in user as the SPA knows it (`SessionUser`). Memberships carry the
 * business's current name, so a rename shows in the dashboard straight away.
 */
export async function toSessionUser(user: User): Promise<SessionUser> {
  const memberships = await BusinessMembership.query().where('userId', user.id)
  const businesses = memberships.length
    ? await Business.query()
        .whereIn(
          'id',
          memberships.map((membership) => membership.businessId)
        )
        .select('id', 'name')
    : []
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    memberships: memberships.map((membership) => ({
      businessId: membership.businessId,
      businessName:
        businesses.find((business) => business.id === membership.businessId)?.name ?? '',
      role: membership.role,
    })),
    emailVerified: Boolean(user.emailVerifiedAt),
  }
}

export function requireRole(user: User, roles: UserRole[], message: string) {
  if (!hasAnyRole({ roles: user.roles } as SessionUser, roles)) throw new ApiError(message, 403)
}

/** The admin console: moderation is for administrators; support staff can work cases and look up accounts. */
export function requireStaff(user: User, roles: UserRole[]) {
  requireRole(user, roles, 'This is for Dapita staff only.')
}

/**
 * Pass `client` when calling inside a transaction, so the query sees the
 * transaction's own changes.
 */
export async function isMember(user: User, businessId: ID, client?: TransactionClientContract) {
  const membership = await BusinessMembership.query({ client })
    .where({ userId: user.id, businessId })
    .first()
  return Boolean(membership)
}

/** Owners and staff of the business only. */
export async function requireMember(user: User, businessId: ID) {
  if (!(await isMember(user, businessId))) throw noBusinessAccess()
}
