import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { updateMockAccounts, readMockAccounts } from '@/services/mock/accounts'
import { clone, createMockId, delay } from '@/services/mock/utils'
import { getMockSessionUser, mockAccountDefaults } from '@/services/mock/users'
import type { MyProfileValues } from '@/schemas/account'
import type { ConsentRecord, DeletionRequest, MyProfile } from '@/types/account'

/** The signed-in user's own account (CUS-06, doc §9.1 "Customer account"). */
export interface ProfileService {
  getMyProfile: () => Promise<MyProfile>
  updateMyProfile: (input: MyProfileValues) => Promise<MyProfile>
  getMyConsents: () => Promise<ConsentRecord[]>
  /** Asks for the account to be deleted. Support handles the request (doc §13.2); nothing is deleted at once. */
  requestAccountDeletion: () => Promise<DeletionRequest>
}

// Endpoints from docs/implementation-plan.md §7.3 (Account).
const httpProfileService: ProfileService = {
  getMyProfile: () => apiClient.get<MyProfile>('/me/profile'),
  updateMyProfile: (input) => apiClient.put<MyProfile>('/me/profile', input),
  getMyConsents: () => apiClient.get<ConsentRecord[]>('/me/consents'),
  requestAccountDeletion: () => apiClient.post<DeletionRequest>('/me/deletion-request'),
}

function requireUser() {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  return user
}

function mockProfile(userId: string): MyProfile {
  const user = requireUser()
  const state = readMockAccounts().state[userId]
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: state?.phone,
    emailVerified: user.emailVerified,
    createdAt: mockAccountDefaults(userId).createdAt,
    deletionRequest: state?.deletionRequest,
  }
}

// MOCK: reads and writes mock/accounts.ts in this browser. Nothing is sent anywhere.
const mockProfileService: ProfileService = {
  async getMyProfile() {
    await delay(300)
    return clone(mockProfile(requireUser().id))
  },
  async updateMyProfile({ name, phone }) {
    await delay(600)
    const { id } = requireUser()
    updateMockAccounts((store) => {
      store.state[id] = { ...store.state[id], name: name.trim(), phone: phone || undefined }
    })
    return clone(mockProfile(id))
  },
  async getMyConsents() {
    await delay(300)
    return clone(mockAccountDefaults(requireUser().id).consents)
  },
  async requestAccountDeletion() {
    await delay(600)
    const { id } = requireUser()
    return updateMockAccounts((store) => {
      const existing = store.state[id]?.deletionRequest
      if (existing) return clone(existing)
      const request: DeletionRequest = {
        id: createMockId('del'),
        requestedAt: new Date().toISOString(),
        status: 'received',
      }
      store.state[id] = { ...store.state[id], deletionRequest: request }
      return clone(request)
    })
  },
}

export const profileService: ProfileService = env.useMocks ? mockProfileService : httpProfileService
