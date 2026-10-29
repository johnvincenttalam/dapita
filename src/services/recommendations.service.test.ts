import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { favoritesService } from '@/services/favorites.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { recommendationsService } from '@/services/recommendations.service'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const signInAsCustomer = () => localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)

beforeEach(() => {
  localStorage.clear()
})

describe('recommendations (mock service)', () => {
  it('gives guests no similar_customers picks', async () => {
    const list = await recommendationsService.listRecommendations()
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((entry) => entry.reason === 'similar_customers')).toBe(false)
  })

  it('gives the demo customer Clearday as similar_customers and none of her booked or saved shops', async () => {
    signInAsCustomer()
    const list = await recommendationsService.listRecommendations()
    expect(list.find((entry) => entry.shop.id === 'biz_clearday')?.reason).toBe('similar_customers')
    const ids = list.map((entry) => entry.shop.id)
    for (const id of ['biz_good_cut', 'biz_serenity', 'biz_glow_go', 'biz_polished', 'biz_hilot', 'biz_bloom']) {
      expect(ids).not.toContain(id)
    }
  })

  it('leaves a shop out once it is saved', async () => {
    signInAsCustomer()
    await favoritesService.saveFavorite('biz_clearday')
    const ids = (await recommendationsService.listRecommendations()).map((entry) => entry.shop.id)
    expect(ids).not.toContain('biz_clearday')
  })
})
