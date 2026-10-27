import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { merchantSettingsService } from '@/services/merchant-settings.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function signInAs(account: MockAccount | null) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  else localStorage.removeItem(MOCK_SESSION_KEY)
}

beforeEach(() => {
  localStorage.clear()
  signInAs('merchant')
})

describe('merchant notification settings (mock service)', () => {
  it('starts with request and message emails on and the summary off', async () => {
    expect(await merchantSettingsService.getNotificationSettings('biz_good_cut')).toEqual({
      newRequest: true,
      requestExpiring: true,
      newMessage: true,
      dailySummary: false,
    })
  })

  it('remembers changes for this person and business', async () => {
    const saved = await merchantSettingsService.updateNotificationSettings('biz_good_cut', {
      newRequest: true,
      requestExpiring: false,
      newMessage: false,
      dailySummary: true,
    })
    expect(saved).toMatchObject({ requestExpiring: false, dailySummary: true })
    expect(await merchantSettingsService.getNotificationSettings('biz_good_cut')).toEqual(saved)
  })

  it('is only for members of the business', async () => {
    signInAs('customer')
    await expect(merchantSettingsService.getNotificationSettings('biz_good_cut')).rejects.toMatchObject({
      status: 403,
    })
    signInAs(null)
    await expect(merchantSettingsService.getNotificationSettings('biz_good_cut')).rejects.toMatchObject({
      status: 401,
    })
  })
})
