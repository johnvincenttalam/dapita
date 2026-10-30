import { apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { recommendShops } from '@/lib/recommendations'
import { readMockAccounts } from '@/services/mock/accounts'
import { readMockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { clone, delay } from '@/services/mock/utils'
import { toSummary } from '@/services/shops.service'
import type { Recommendation } from '@/types/recommendation'

/** Shop suggestions for the home and Favorites pages. Distance is blended on the device. */
export interface RecommendationsService {
  listRecommendations: () => Promise<Recommendation[]>
}

const httpRecommendationsService: RecommendationsService = {
  listRecommendations: () => apiClient.get<Recommendation[]>('/recommendations'),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Same inputs as server/app/services/recommendations.ts, scored by the same module.

const mockRecommendationsService: RecommendationsService = {
  async listRecommendations() {
    await delay(300)
    const user = getMockSessionUser()
    const db = readMockDb()
    const shops = db.businesses
      .filter((business) => business.status === 'approved')
      .map((business) => toSummary(db, business))
    const withdrawn = Object.entries(readMockAccounts().state).flatMap(([userId, state]) =>
      state.deletionRequest ? [userId] : [],
    )

    const scored = recommendShops({
      viewer: user ? { id: user.id, memberBusinessIds: user.memberships.map((m) => m.businessId) } : undefined,
      bookings: db.bookings,
      favorites: db.favorites ?? [],
      withdrawnUserIds: new Set(withdrawn),
      shops,
      now: new Date(),
    })
    const shopById = new Map(shops.map((shop) => [shop.id, shop]))
    return clone(scored.map(({ businessId, ...rest }) => ({ shop: shopById.get(businessId)!, ...rest })))
  },
}

export const recommendationsService: RecommendationsService = env.useMocks
  ? mockRecommendationsService
  : httpRecommendationsService
