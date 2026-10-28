import { legalDocuments } from '@/config/legal'
import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { mockPasswordFingerprint, updateMockAccounts } from '@/services/mock/accounts'
import { readMockDb, updateMockDb } from '@/services/mock/db'
import { createDraftBusiness } from '@/services/mock/draft-business'
import { clone, createMockId, delay } from '@/services/mock/utils'
import {
  checkMockPassword,
  findMockUserByEmail,
  getMockSessionUser,
  isMockUserSuspended,
  listMockUsers,
  MOCK_SESSION_KEY,
} from '@/services/mock/users'
import type { SignInInput } from '@/schemas/auth'
import type { ConsentPurpose } from '@/types/account'
import type { AccountType, Session, SessionUser } from '@/types/auth'

/** What the sign-up forms send. Consents carry the document versions the user accepted. */
export interface SignUpRequest {
  accountType: AccountType
  name: string
  email: string
  phone?: string
  password: string
  /** Business owners only: the business they will list (MER-01). */
  businessName?: string
  consents: { purpose: ConsentPurpose; version: string }[]
}

export interface AuthService {
  getSession: () => Promise<Session>
  signIn: (input: SignInInput) => Promise<SessionUser>
  signOut: () => Promise<void>
  /** Creates the account and signs it in; a verification email follows (plan §8, item 6). */
  signUp: (input: SignUpRequest) => Promise<SessionUser>
  /** Confirms the email address with the token from the verification link. */
  verifyEmail: (token: string) => Promise<SessionUser>
  /** Sends a reset link if an account exists. Resolves either way, so it can't reveal who has an account. */
  requestPasswordReset: (email: string) => Promise<void>
}

/** The consents a sign-up records, at the current document versions. */
export function signUpConsents(accountType: AccountType): SignUpRequest['consents'] {
  const purposes: ConsentPurpose[] =
    accountType === 'business' ? ['terms', 'privacy_notice', 'merchant_policy'] : ['terms', 'privacy_notice']
  return purposes.map((purpose) => ({ purpose, version: legalDocuments[purpose].version }))
}

// Endpoints from docs/implementation-plan.md §7.3. The session itself is an
// httpOnly cookie set by the backend; the SPA never stores tokens.
const httpAuthService: AuthService = {
  getSession: () => apiClient.get<Session>('/auth/session'),
  signIn: (input) => apiClient.post<SessionUser>('/auth/sign-in', input),
  signOut: () => apiClient.post<void>('/auth/sign-out'),
  signUp: (input) => apiClient.post<SessionUser>('/auth/sign-up', input),
  verifyEmail: (token) => apiClient.post<SessionUser>('/auth/verify', { token }),
  requestPasswordReset: (email) => apiClient.post<void>('/auth/forgot-password', { email }),
}

/** MOCK: the token a simulated verification link carries. */
export const mockVerificationToken = (userId: string) => `mock-verify.${userId}`

// MOCK: the "session" is a user id in localStorage. Nothing leaves the browser,
// and no email is sent.

/** Memberships carry the business's current name, so a rename shows in the dashboard straight away. */
function withBusinessNames(user: SessionUser): SessionUser {
  const { businesses } = readMockDb()
  return {
    ...clone(user),
    memberships: user.memberships.map((membership) => ({
      ...membership,
      businessName:
        businesses.find((business) => business.id === membership.businessId)?.name ?? membership.businessName,
    })),
  }
}

const mockAuthService: AuthService = {
  async getSession() {
    await delay(150)
    const user = getMockSessionUser()
    return user ? withBusinessNames(user) : null
  },
  async signIn({ email, password }) {
    await delay(600)
    const user = findMockUserByEmail(email)
    if (!user || !checkMockPassword(user.id, password)) {
      throw new ApiError('Incorrect email or password (mock response).', 401)
    }
    if (isMockUserSuspended(user.id)) throw new ApiError('This account is suspended. Contact Dapita support.', 403)
    localStorage.setItem(MOCK_SESSION_KEY, user.id)
    return withBusinessNames(user)
  },
  async signOut() {
    await delay(200)
    localStorage.removeItem(MOCK_SESSION_KEY)
  },
  async signUp(input) {
    await delay(800)
    const email = input.email.trim().toLowerCase()
    if (findMockUserByEmail(email)) {
      throw new ApiError('An account with this email already exists. Sign in instead.', 409, { code: 'email_taken' })
    }
    const now = new Date().toISOString()
    const id = createMockId('usr')
    const user: SessionUser = {
      id,
      name: input.name.trim(),
      email,
      roles: input.accountType === 'business' ? ['customer', 'merchant_owner'] : ['customer'],
      // The listing starts as a private draft (below), finished in onboarding and reviewed before it goes live.
      memberships:
        input.accountType === 'business' && input.businessName
          ? [{ businessId: createMockId('biz'), businessName: input.businessName.trim(), role: 'owner' }]
          : [],
      emailVerified: false,
    }
    updateMockAccounts((store) => {
      store.accounts.push({ user, passwordFingerprint: mockPasswordFingerprint(input.password) })
      store.state[id] = {
        phone: input.phone || undefined,
        createdAt: now,
        consents: input.consents.map((consent) => ({
          id: createMockId('cns'),
          purpose: consent.purpose,
          version: consent.version,
          grantedAt: now,
        })),
      }
    })
    const membership = user.memberships[0]
    if (membership) {
      updateMockDb((db) =>
        createDraftBusiness(db, {
          id: membership.businessId,
          ownerId: id,
          name: membership.businessName,
          phone: input.phone || undefined,
        }),
      )
    }
    localStorage.setItem(MOCK_SESSION_KEY, id)
    return withBusinessNames(user)
  },
  async verifyEmail(token) {
    await delay(500)
    const user = listMockUsers().find((candidate) => mockVerificationToken(candidate.id) === token)
    if (!user) throw new ApiError('This verification link is invalid or has expired.', 400, { code: 'invalid_token' })
    updateMockAccounts((store) => {
      store.state[user.id] = { ...store.state[user.id], emailVerified: true }
    })
    return { ...withBusinessNames(user), emailVerified: true }
  },
  async requestPasswordReset() {
    await delay(600)
  },
}

export const authService: AuthService = env.useMocks ? mockAuthService : httpAuthService
