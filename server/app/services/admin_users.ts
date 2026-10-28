import db from '@adonisjs/lucid/services/db'
import AccountAction from '#models/account_action'
import Business from '#models/business'
import BusinessMembership from '#models/business_membership'
import User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { requireText } from '#helpers/validate'
import { requireStaff } from '#services/accounts'
import { hasAnyRole, type AdminUser, type ID, type SessionUser } from '#shared/domain'

/**
 * Account lookup and suspension, ported from the mock in src/services/admin.service.ts.
 * Staff can look accounts up; only administrators suspend or reinstate, always with a
 * reason that joins the account's history. A suspended account can't sign in, and its
 * open sessions are refused (auth middleware).
 */

const isAdmin = (user: User) => hasAnyRole({ roles: user.roles } as SessionUser, ['admin'])

async function toAdminUsers(users: User[]): Promise<AdminUser[]> {
  if (!users.length) return []
  const ids = users.map((user) => user.id)
  const [memberships, actions] = await Promise.all([
    BusinessMembership.query().whereIn('userId', ids),
    AccountAction.query().whereIn('userId', ids).orderBy('at', 'desc'),
  ])
  const businesses = memberships.length
    ? await Business.query()
        .whereIn(
          'id',
          memberships.map((membership) => membership.businessId)
        )
        .select('id', 'name')
    : []
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    businessNames: memberships
      .filter((membership) => membership.userId === user.id)
      .flatMap(
        (membership) =>
          businesses.find((business) => business.id === membership.businessId)?.name ?? []
      ),
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
    suspended: Boolean(user.suspendedAt),
    suspendedReason: user.suspendedReason ?? undefined,
    history: actions
      .filter((action) => action.userId === user.id)
      .map((action) => ({
        action: action.action,
        reason: action.reason,
        actorName: action.actorName,
        at: action.at,
      })),
  }))
}

/** Matches the name or email; `%` and `_` in the search are taken literally. */
export async function listUsers(staff: User, query?: string) {
  requireStaff(staff, ['admin', 'support'])
  const needle = query?.trim().toLowerCase()
  const pattern = needle ? `%${needle.replace(/[\\%_]/g, '\\$&')}%` : undefined
  const users = await User.query()
    .if(pattern, (builder) =>
      builder.where((where) => where.whereILike('name', pattern!).orWhereILike('email', pattern!))
    )
    .orderBy('name', 'asc')
  return toAdminUsers(users)
}

async function accountAction(
  admin: User,
  userId: ID,
  reason: unknown,
  action: 'suspend' | 'reinstate'
) {
  requireStaff(admin, ['admin'])
  const text = requireText(reason, 'a reason')
  const user = await db.transaction(async (trx) => {
    const target = await User.query({ client: trx }).where('id', userId).forUpdate().first()
    if (!target) throw new ApiError('We couldn’t find that account.', 404)
    if (action === 'suspend') {
      if (target.id === admin.id) throw new ApiError('You can’t suspend your own account.', 409)
      if (isAdmin(target)) {
        throw new ApiError('Administrator accounts can’t be suspended here.', 403)
      }
      if (target.suspendedAt) throw new ApiError('This account is already suspended.', 409)
    } else if (!target.suspendedAt) {
      throw new ApiError('This account isn’t suspended.', 409)
    }
    const now = new Date().toISOString()
    target.merge(
      action === 'suspend'
        ? { suspendedAt: now, suspendedReason: text, updatedAt: now }
        : { suspendedAt: null, suspendedReason: null, updatedAt: now }
    )
    await target.save()
    await AccountAction.create(
      {
        id: newId('acc'),
        userId,
        action,
        reason: text,
        actorId: admin.id,
        actorName: admin.name,
        at: now,
      },
      { client: trx }
    )
    return target
  })
  const [result] = await toAdminUsers([user])
  return result
}

export function suspendUser(admin: User, userId: ID, reason: unknown) {
  return accountAction(admin, userId, reason, 'suspend')
}

export function reinstateUser(admin: User, userId: ID, reason: unknown) {
  return accountAction(admin, userId, reason, 'reinstate')
}
