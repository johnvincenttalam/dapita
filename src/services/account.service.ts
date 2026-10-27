import { apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { defaultNotificationPreferences, defaultProfile } from '@/services/mock/data'
import { clone, delay } from '@/services/mock/utils'
import type { RegistrationInput, SignInInput } from '@/schemas/auth'
import type { NotificationPreferences, Profile } from '@/types/domain'

export interface AccountService {
  getProfile: () => Promise<Profile>
  updateProfile: (profile: Profile) => Promise<Profile>
  getNotificationPreferences: () => Promise<NotificationPreferences>
  updateNotificationPreferences: (prefs: NotificationPreferences) => Promise<NotificationPreferences>
  register: (input: RegistrationInput) => Promise<{ id: string }>
  signIn: (input: SignInInput) => Promise<{ name: string }>
}

const httpAccountService: AccountService = {
  getProfile: () => apiClient.get<Profile>('/me/profile'),
  updateProfile: (profile) => apiClient.put<Profile>('/me/profile', profile),
  getNotificationPreferences: () => apiClient.get<NotificationPreferences>('/me/notifications'),
  updateNotificationPreferences: (prefs) => apiClient.put<NotificationPreferences>('/me/notifications', prefs),
  register: ({ confirmPassword: _confirm, ...input }) => apiClient.post<{ id: string }>('/auth/register', input),
  signIn: (input) => apiClient.post<{ name: string }>('/auth/sign-in', input),
}

// MOCK: values live in memory and reset when the page reloads. Nothing is sent anywhere.
let profileStore = clone(defaultProfile)
let preferencesStore = clone(defaultNotificationPreferences)

/** Emails the mock register endpoint treats as already in use, to demo server-side errors. */
export const MOCK_TAKEN_EMAIL = 'taken@example.com'
/** Password the mock sign-in endpoint accepts. */
export const MOCK_SIGN_IN_PASSWORD = 'password123'

const mockAccountService: AccountService = {
  async getProfile() {
    await delay(400)
    return clone(profileStore)
  },
  async updateProfile(profile) {
    await delay(800)
    profileStore = clone(profile)
    return clone(profileStore)
  },
  async getNotificationPreferences() {
    await delay(400)
    return clone(preferencesStore)
  },
  async updateNotificationPreferences(prefs) {
    await delay(800)
    preferencesStore = clone(prefs)
    return clone(preferencesStore)
  },
  async register(input) {
    await delay(1000)
    if (input.email.toLowerCase() === MOCK_TAKEN_EMAIL) {
      throw new Error('An account with this email already exists (mock response).')
    }
    return { id: `usr_mock_${Date.now()}` }
  },
  async signIn(input) {
    await delay(800)
    if (input.password !== MOCK_SIGN_IN_PASSWORD) {
      throw new Error('Incorrect email or password (mock response).')
    }
    return { name: input.email.split('@')[0] ?? 'there' }
  },
}

export const accountService: AccountService = env.useMocks ? mockAccountService : httpAccountService
