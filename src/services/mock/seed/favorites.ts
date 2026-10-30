import type { Favorite } from '@/types/account'

/**
 * Saved shops for the demo. Three walk-in customers who saved Glow & Go (where the demo
 * customer has a confirmed booking) also saved Clearday Skin, so she gets a real
 * "Customers like you" suggestion.
 */
export function createSeedFavorites(now: Date): Favorite[] {
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
  return [
    { userId: 'usr_john', businessId: 'biz_glow_go', savedAt: daysAgo(9) },
    { userId: 'usr_john', businessId: 'biz_clearday', savedAt: daysAgo(4) },
    { userId: 'usr_mark', businessId: 'biz_glow_go', savedAt: daysAgo(7) },
    { userId: 'usr_mark', businessId: 'biz_clearday', savedAt: daysAgo(3) },
    { userId: 'usr_alyssa', businessId: 'biz_clearday', savedAt: daysAgo(6) },
    { userId: 'usr_alyssa', businessId: 'biz_glow_go', savedAt: daysAgo(1) },
  ]
}
