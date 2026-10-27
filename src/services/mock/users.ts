import { legalDocuments } from '@/config/legal'
import { mockPasswordFingerprint, readMockAccounts, type MockAccountState } from '@/services/mock/accounts'
import type { ConsentPurpose } from '@/types/account'
import type { SessionUser } from '@/types/auth'

// MOCK: demo accounts for the prototype. There is no real authentication; these
// built-in accounts sign in with MOCK_PASSWORD, and accounts created through
// sign-up live in mock/accounts.ts. Remove once a real auth provider exists.

export const MOCK_PASSWORD = 'password123'

/** localStorage key holding the signed-in mock user's id, so a demo session survives reloads. */
export const MOCK_SESSION_KEY = 'glamspot-mock-session'

export const mockUsers = {
  customer: {
    id: 'usr_customer',
    name: 'Andrea Reyes',
    email: 'customer@example.com',
    roles: ['customer'],
    memberships: [],
    emailVerified: true,
  },
  merchant: {
    id: 'usr_merchant',
    name: 'Paolo Mendoza',
    email: 'owner@example.com',
    roles: ['customer', 'merchant_owner'],
    memberships: [{ businessId: 'biz_good_cut', businessName: 'The Good Cut Barbershop', role: 'owner' }],
    emailVerified: true,
  },
  admin: {
    id: 'usr_admin',
    name: 'Mika Santos',
    email: 'admin@example.com',
    roles: ['admin'],
    memberships: [],
    emailVerified: true,
  },
} as const satisfies Record<string, SessionUser>

export type MockAccount = keyof typeof mockUsers

export const mockAccountLabels: Record<MockAccount, string> = {
  customer: 'Customer',
  merchant: 'Business owner',
  admin: 'Administrator',
}

const builtInUsers: SessionUser[] = Object.values(mockUsers)

const isBuiltIn = (id: string) => builtInUsers.some((user) => user.id === id)

/** Every mock account: the built-in demo users plus accounts created through sign-up, with profile edits applied. */
export function listMockUsers(): SessionUser[] {
  const store = readMockAccounts()
  return [...builtInUsers, ...store.accounts.map((account) => account.user)].map((user) => {
    const state = store.state[user.id]
    return {
      ...user,
      name: state?.name ?? user.name,
      emailVerified: state?.emailVerified ?? user.emailVerified,
    }
  })
}

export function findMockUserByEmail(email: string) {
  return listMockUsers().find((user) => user.email === email.trim().toLowerCase())
}

/** Built-in accounts use MOCK_PASSWORD; accounts from sign-up use the password chosen there. */
export function checkMockPassword(userId: string, password: string) {
  if (isBuiltIn(userId)) return password === MOCK_PASSWORD
  const account = readMockAccounts().accounts.find((candidate) => candidate.user.id === userId)
  return account?.passwordFingerprint === mockPasswordFingerprint(password)
}

/**
 * When the account was created and the documents it accepted. Built-in demo accounts
 * get records dated 30 days before the mock store was first created.
 */
export function mockAccountDefaults(userId: string): Required<Pick<MockAccountState, 'createdAt' | 'consents'>> {
  const store = readMockAccounts()
  const state = store.state[userId]
  const createdAt =
    state?.createdAt ?? new Date(new Date(store.createdAt).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const purposes: ConsentPurpose[] =
    mockUsers.merchant.id === userId ? ['terms', 'privacy_notice', 'merchant_policy'] : ['terms', 'privacy_notice']
  const consents =
    state?.consents ??
    purposes.map((purpose) => ({
      id: `cns_${userId}_${purpose}`,
      purpose,
      version: legalDocuments[purpose].version,
      grantedAt: createdAt,
    }))
  return { createdAt, consents }
}

/**
 * The signed-in mock user, standing in for the server reading the session
 * cookie. Mock services call this to authorize requests.
 */
export function getMockSessionUser(): SessionUser | null {
  let id: string | null = null
  try {
    id = localStorage.getItem(MOCK_SESSION_KEY)
  } catch {
    // Storage blocked: treat as signed out.
  }
  // A suspended account's session ends at once, the way the server would revoke it.
  if (id && isMockUserSuspended(id)) return null
  return listMockUsers().find((user) => user.id === id) ?? null
}

export function isMockUserSuspended(userId: string) {
  return Boolean(readMockAccounts().state[userId]?.suspendedAt)
}
