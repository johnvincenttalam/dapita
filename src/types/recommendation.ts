import type { ShopSummary } from '@/types/business'
import type { ID } from '@/types/common'

/** Why a shop is suggested; the card's tag says it in words. */
export type RecommendationReason = 'similar_customers' | 'popular_in_category' | 'popular' | 'none'

/** What GET /api/recommendations returns per shop. Never names another customer. */
export interface Recommendation {
  shop: ShopSummary
  /** 0–1. Each reason has its own band, so a better reason always ranks higher. */
  fit: number
  reason: RecommendationReason
  /** The category behind a `popular_in_category` pick, for "Popular in Barber". */
  categoryId?: ID
}
