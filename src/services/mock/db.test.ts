import { describe, expect, it } from 'vitest'

import { createSeedDb } from '@/services/mock/db'

describe('mock seed', () => {
  it('seeds three other customers who saved Glow & Go and Clearday', () => {
    const now = new Date('2026-10-29T08:00:00Z')
    const favorites = createSeedDb(now).favorites ?? []
    for (const userId of ['usr_john', 'usr_mark', 'usr_alyssa']) {
      expect(
        favorites
          .filter((favorite) => favorite.userId === userId)
          .map((favorite) => favorite.businessId)
          .sort(),
      ).toEqual(['biz_clearday', 'biz_glow_go'])
    }
    expect(favorites.every((favorite) => Date.parse(favorite.savedAt) < now.getTime())).toBe(true)
  })
})
