import type { ID } from '@/types/common'
import type { Service, ShopSummary } from '@/types/business'

export interface AssistantShopResult {
  shop: ShopSummary
  /** The specific service that matched, when one did. Drives the Book link and any price claim. */
  service?: Service
  distanceKm?: number
}

export interface AssistantReply {
  text: string
  shops: AssistantShopResult[]
  /** Explore URL carrying the same filters; set when a find produced results. */
  exploreHref?: string
  /** Tappable follow-ups, sent as if typed. */
  suggestions: string[]
}

export type AssistantMessage =
  { id: ID; role: 'user'; text: string } | { id: ID; role: 'assistant'; reply: AssistantReply }
