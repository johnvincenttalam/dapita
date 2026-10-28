import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { hasAnyRole } from '@/lib/roles'
import { readMockDb, updateMockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { clone, delay } from '@/services/mock/utils'
import { toSummary } from '@/services/shops.service'
import type { ShopSummary } from '@/types/business'
import type { ID } from '@/types/common'

/** The customer's saved shops (CUS-07). */
export interface FavoritesService {
  /** Saved shops that are still listed, most recently saved first. */
  listMyFavorites: () => Promise<ShopSummary[]>
  /** Saving a shop that's already saved keeps the first save. */
  saveFavorite: (businessId: ID) => Promise<void>
  removeFavorite: (businessId: ID) => Promise<void>
}

const favoritePath = (businessId: ID) => `/me/favorites/${encodeURIComponent(businessId)}`

const httpFavoritesService: FavoritesService = {
  listMyFavorites: () => apiClient.get<ShopSummary[]>('/me/favorites'),
  saveFavorite: (businessId) => apiClient.put<void>(favoritePath(businessId)),
  removeFavorite: (businessId) => apiClient.delete<void>(favoritePath(businessId)),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Same rules as server/app/services/favorites.ts. A shop that leaves the
// marketplace drops out of the list but stays saved.

function requireCustomer() {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  if (!hasAnyRole(user, ['customer'])) throw new ApiError('Only customer accounts can save shops.', 403)
  return user
}

const mockFavoritesService: FavoritesService = {
  async listMyFavorites() {
    await delay(300)
    const user = requireCustomer()
    const db = readMockDb()
    return clone(
      (db.favorites ?? [])
        .filter((favorite) => favorite.userId === user.id)
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
        .flatMap((favorite) => {
          const business = db.businesses.find(
            (candidate) => candidate.id === favorite.businessId && candidate.status === 'approved',
          )
          return business ? [toSummary(db, business)] : []
        }),
    )
  },

  async saveFavorite(businessId) {
    await delay(250)
    const user = requireCustomer()
    updateMockDb((db) => {
      const business = db.businesses.find((candidate) => candidate.id === businessId && candidate.status === 'approved')
      if (!business) throw new ApiError('This shop isn’t available any more.', 404)
      if (user.memberships.some((membership) => membership.businessId === businessId)) {
        throw new ApiError('You can’t save your own business.', 422)
      }
      const favorites = (db.favorites ??= [])
      if (favorites.some((favorite) => favorite.userId === user.id && favorite.businessId === businessId)) return
      favorites.push({ userId: user.id, businessId, savedAt: new Date().toISOString() })
    })
  },

  async removeFavorite(businessId) {
    await delay(250)
    const user = requireCustomer()
    updateMockDb((db) => {
      db.favorites = (db.favorites ?? []).filter(
        (favorite) => !(favorite.userId === user.id && favorite.businessId === businessId),
      )
    })
  },
}

export const favoritesService: FavoritesService = env.useMocks ? mockFavoritesService : httpFavoritesService
