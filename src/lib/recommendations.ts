import type { Favorite } from '@/types/account'
import type { Booking, BookingStatus } from '@/types/booking'
import type { ShopSummary } from '@/types/business'
import type { ID } from '@/types/common'
import type { RecommendationReason } from '@/types/recommendation'

// Shop suggestions (docs/superpowers/specs/2026-10-28-recommendations-design.md).
// Pure, so the server (via server/app/shared/domain.ts) and mock mode score the same way.

export const recommendationRules = {
  /** "Customers like you" needs this many other customers behind it, so no one's booking can be traced. */
  minNeighbours: 3,
  popularityWindowDays: 90,
  /** Nearby search widens through these before falling back to the whole city. */
  radiiKm: [5, 10, 20],
  minNearby: 3,
  limit: 8,
  /** Share of fit in the blended score; distance gets the rest. */
  fitWeight: 0.6,
} as const

export interface RecommendInput {
  viewer?: { id: ID; memberBusinessIds: readonly ID[] }
  bookings: readonly Pick<Booking, 'customerId' | 'businessId' | 'status' | 'start'>[]
  favorites: readonly Pick<Favorite, 'userId' | 'businessId'>[]
  /** Customers who asked for their account to be deleted: left out of everyone else's matching. */
  withdrawnUserIds: ReadonlySet<ID>
  /** Approved shops only. */
  shops: readonly Pick<ShopSummary, 'id' | 'name' | 'categoryIds'>[]
  now: Date
}

export interface ScoredShop {
  businessId: ID
  fit: number
  reason: RecommendationReason
  categoryId?: ID
}

/** A shop counts as used once the customer saved it or has an agreed booking there. */
const usedStatuses: readonly BookingStatus[] = ['confirmed', 'completed']

/** Each reason's fit range, so a better reason always outranks a worse one. */
const bands: Record<Exclude<RecommendationReason, 'none'>, { floor: number; span: number }> = {
  similar_customers: { floor: 0.7, span: 0.3 },
  popular_in_category: { floor: 0.4, span: 0.3 },
  popular: { floor: 0.1, span: 0.3 },
}

function addTo(map: Map<ID, Set<ID>>, key: ID, value: ID) {
  const set = map.get(key)
  if (set) set.add(value)
  else map.set(key, new Set([value]))
}

/** One entry per shop the viewer could be shown, best fit first. */
export function recommendShops({
  viewer,
  bookings,
  favorites,
  withdrawnUserIds,
  shops,
  now,
}: RecommendInput): ScoredShop[] {
  const counted = (userId: ID) => userId === viewer?.id || !withdrawnUserIds.has(userId)

  // Shops each customer used.
  const usedBy = new Map<ID, Set<ID>>()
  for (const favorite of favorites) if (counted(favorite.userId)) addTo(usedBy, favorite.userId, favorite.businessId)
  for (const booking of bookings) {
    if (usedStatuses.includes(booking.status) && counted(booking.customerId))
      addTo(usedBy, booking.customerId, booking.businessId)
  }

  const excluded = new Set<ID>(viewer?.memberBusinessIds)
  if (viewer) {
    for (const favorite of favorites) if (favorite.userId === viewer.id) excluded.add(favorite.businessId)
    for (const booking of bookings) {
      if (booking.customerId === viewer.id && booking.status !== 'draft') excluded.add(booking.businessId)
    }
  }

  // Popularity: agreed bookings from the window's start onwards (upcoming ones are real demand), saves as a tiebreak.
  const windowStart = now.getTime() - recommendationRules.popularityWindowDays * 86_400_000
  const recentBookings = new Map<ID, number>()
  for (const booking of bookings) {
    if (
      usedStatuses.includes(booking.status) &&
      Date.parse(booking.start) >= windowStart &&
      counted(booking.customerId)
    )
      recentBookings.set(booking.businessId, (recentBookings.get(booking.businessId) ?? 0) + 1)
  }
  const saves = new Map<ID, number>()
  for (const favorite of favorites) {
    if (counted(favorite.userId)) saves.set(favorite.businessId, (saves.get(favorite.businessId) ?? 0) + 1)
  }
  const maxSaves = Math.max(0, ...saves.values())
  // Below one booking, so saves only ever break ties between equal booking counts.
  const popularity = (id: ID) => (recentBookings.get(id) ?? 0) + (saves.get(id) ?? 0) / (maxSaves + 1)

  // Neighbours: other customers who used at least one of the viewer's shops, weighted by Jaccard similarity.
  const viewerUsed = (viewer && usedBy.get(viewer.id)) || new Set<ID>()
  const neighbours = new Map<ID, number>()
  for (const [userId, used] of usedBy) {
    if (userId === viewer?.id) continue
    const shared = [...used].filter((id) => viewerUsed.has(id)).length
    if (shared) neighbours.set(userId, shared / new Set([...used, ...viewerUsed]).size)
  }

  const shopById = new Map(shops.map((shop) => [shop.id, shop]))
  const viewerCategories = new Set(
    [...viewerUsed].flatMap((id) => {
      const primary = shopById.get(id)?.categoryIds[0]
      return primary ? [primary] : []
    }),
  )

  const raw = shops
    .filter((shop) => !excluded.has(shop.id))
    .map((shop) => {
      let similarity = 0
      let neighbourCount = 0
      for (const [userId, weight] of neighbours) {
        if (usedBy.get(userId)?.has(shop.id)) {
          similarity += weight
          neighbourCount += 1
        }
      }
      if (neighbourCount >= recommendationRules.minNeighbours)
        return { shop, reason: 'similar_customers' as const, score: similarity }

      const recent = recentBookings.get(shop.id) ?? 0
      if (!recent) return { shop, reason: 'none' as const, score: 0 }
      const categoryId = shop.categoryIds.find((id) => viewerCategories.has(id))
      return categoryId
        ? { shop, reason: 'popular_in_category' as const, score: popularity(shop.id), categoryId }
        : { shop, reason: 'popular' as const, score: popularity(shop.id) }
    })

  const maxScore = new Map<RecommendationReason, number>()
  for (const entry of raw) maxScore.set(entry.reason, Math.max(maxScore.get(entry.reason) ?? 0, entry.score))

  return raw
    .map(({ shop, reason, score, categoryId }): ScoredShop => {
      const fit = reason === 'none' ? 0 : bands[reason].floor + (bands[reason].span * score) / maxScore.get(reason)!
      return categoryId ? { businessId: shop.id, fit, reason, categoryId } : { businessId: shop.id, fit, reason }
    })
    .sort((a, b) => b.fit - a.fit || shopById.get(a.businessId)!.name.localeCompare(shopById.get(b.businessId)!.name))
}
