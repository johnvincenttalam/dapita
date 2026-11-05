import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { updateMockDb } from '@/services/mock/db'
import { profileService } from '@/services/profile.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
})

describe('customer interests (mock service)', () => {
  it('starts unanswered', async () => {
    expect(await profileService.getMyInterests()).toEqual({ categoryIds: [] })
  })
  it('saves deduped ids in catalog order with answeredAt', async () => {
    const saved = await profileService.updateMyInterests(['cat_nails', 'cat_barber', 'cat_nails'])
    expect(saved.categoryIds).toEqual(['cat_barber', 'cat_nails'])
    expect(saved.answeredAt).toBeTruthy()
    expect(await profileService.getMyInterests()).toEqual(saved)
  })
  it('accepts an empty answer', async () => {
    expect((await profileService.updateMyInterests([])).answeredAt).toBeTruthy()
  })
  it('refuses an id that is not on the list', async () => {
    await expect(profileService.updateMyInterests(['sub_styling'])).rejects.toMatchObject({
      status: 422,
      message: 'Choose from the categories on the list.',
    })
  })
  it('drops a retired id on read', async () => {
    await profileService.updateMyInterests(['cat_barber', 'cat_nails'])
    updateMockDb((db) => {
      db.categories.find((c) => c.id === 'cat_nails')!.status = 'hidden'
    })
    expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_barber'])
  })
  it('needs a session', async () => {
    localStorage.removeItem(MOCK_SESSION_KEY)
    await expect(profileService.getMyInterests()).rejects.toMatchObject({ status: 401 })
  })
})
