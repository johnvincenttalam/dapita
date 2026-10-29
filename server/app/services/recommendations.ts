import Booking from '#models/booking'
import BusinessMembership from '#models/business_membership'
import DeletionRequest from '#models/deletion_request'
import Favorite from '#models/favorite'
import type User from '#models/user'
import { getPublicShopSummaries } from '#services/shops'
import { recommendShops, type Recommendation } from '#shared/domain'

/**
 * Shop suggestions, scored by the same module as mock mode (src/lib/recommendations.ts).
 * The response holds only shops, a fit and a reason: never another customer. Distance is
 * blended on the device, so this never sees the viewer's location.
 */
export async function listRecommendations(
  user: User | undefined,
  now = new Date()
): Promise<Recommendation[]> {
  const [shops, bookings, favorites, withdrawn, memberships] = await Promise.all([
    getPublicShopSummaries(),
    Booking.query()
      .whereNot('status', 'draft')
      .select('customer_id', 'business_id', 'status', 'start_at'),
    Favorite.query().select('user_id', 'business_id'),
    DeletionRequest.query().select('user_id'),
    user ? BusinessMembership.query().where('userId', user.id).select('business_id') : [],
  ])

  const scored = recommendShops({
    viewer: user && {
      id: user.id,
      memberBusinessIds: memberships.map((membership) => membership.businessId),
    },
    bookings: bookings.map(({ customerId, businessId, status, start }) => ({
      customerId,
      businessId,
      status,
      start,
    })),
    favorites,
    withdrawnUserIds: new Set(withdrawn.map((request) => request.userId)),
    shops,
    now,
  })

  const shopById = new Map(shops.map((shop) => [shop.id, shop]))
  return scored.map(({ businessId, ...rest }) => ({ shop: shopById.get(businessId)!, ...rest }))
}
