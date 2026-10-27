import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { readMockDb, updateMockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { delay } from '@/services/mock/utils'
import type { ID } from '@/types/common'
import type { MerchantNotificationSettings } from '@/types/settings'

export interface MerchantSettingsService {
  getNotificationSettings: (businessId: ID) => Promise<MerchantNotificationSettings>
  updateNotificationSettings: (
    businessId: ID,
    settings: MerchantNotificationSettings,
  ) => Promise<MerchantNotificationSettings>
}

const settingsPath = (businessId: ID) => `/merchant/businesses/${encodeURIComponent(businessId)}/notification-settings`

const httpMerchantSettingsService: MerchantSettingsService = {
  getNotificationSettings: (businessId) => apiClient.get<MerchantNotificationSettings>(settingsPath(businessId)),
  updateNotificationSettings: (businessId, settings) =>
    apiClient.put<MerchantNotificationSettings>(settingsPath(businessId), settings),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Choices are kept per person and business. No email is sent in the prototype.

/** Requests and messages need a timely answer, so those emails start on; the summary is opt-in. */
export const defaultNotificationSettings: MerchantNotificationSettings = {
  newRequest: true,
  requestExpiring: true,
  newMessage: true,
  dailySummary: false,
}

function requireMember(businessId: ID) {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  if (!user.memberships.some((membership) => membership.businessId === businessId)) {
    throw new ApiError('You don’t have access to this business.', 403)
  }
  return `${businessId}:${user.id}`
}

const mockMerchantSettingsService: MerchantSettingsService = {
  async getNotificationSettings(businessId) {
    await delay(250)
    const key = requireMember(businessId)
    return { ...defaultNotificationSettings, ...readMockDb().merchantNotificationSettings?.[key] }
  },

  async updateNotificationSettings(businessId, settings) {
    await delay(400)
    const key = requireMember(businessId)
    const clean: MerchantNotificationSettings = {
      newRequest: Boolean(settings.newRequest),
      requestExpiring: Boolean(settings.requestExpiring),
      newMessage: Boolean(settings.newMessage),
      dailySummary: Boolean(settings.dailySummary),
    }
    updateMockDb((db) => {
      db.merchantNotificationSettings = { ...db.merchantNotificationSettings, [key]: clean }
    })
    return clean
  },
}

export const merchantSettingsService: MerchantSettingsService = env.useMocks
  ? mockMerchantSettingsService
  : httpMerchantSettingsService
