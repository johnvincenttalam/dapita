import { ApiError } from '@/lib/api-client'
import {
  composeFindReply,
  composeGreeting,
  composeShopAnswer,
  composeUnknownReply,
  parseMessage,
  type AssistantContext,
  type FindIntent,
} from '@/lib/assistant'
import { distanceKm } from '@/lib/geo'
import { liveInterestCategories } from '@/lib/interests'
import { catalogService } from '@/services/catalog.service'
import { shopsService, type ShopSearchParams } from '@/services/shops.service'
import type { AssistantReply, AssistantShopResult } from '@/types/assistant'
import type { Service, ShopDetails, ShopSummary } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'
import type { Coordinates, ID } from '@/types/common'

export interface EngineDeps {
  getContext: () => Promise<AssistantContext>
  getShop: (slug: string) => Promise<ShopDetails>
  getShopServices: (slug: string) => Promise<Service[]>
  /** The device's stored position, if any. Read-only; never forwarded. */
  getPosition: () => Coordinates | undefined
  /** Signed-in customer's interest category ids; [] for guests. */
  getInterestCategoryIds: () => readonly ID[]
  now?: () => Date
}

export interface AssistantEngine {
  reply: (message: string) => Promise<AssistantReply>
  greeting: () => AssistantReply | Promise<AssistantReply>
}

const searchPageSize = 50 // the server cap
const maxSearchPages = 10
const serviceCheckLimit = 6
const maxSuggestions = 3
const contextTtlMs = 5 * 60 * 1000

const errorReply: AssistantReply = {
  text: 'Something went wrong while I was looking that up. Please try again in a moment.',
  shops: [],
  suggestions: [],
}

/**
 * Pages through the catalog until `total` is reached.
 * A prefetch is fine for the pilot catalog; a server-backed engine replaces it if the catalog outgrows 10 pages.
 */
export async function fetchAllShops(): Promise<ShopSummary[]> {
  const shops: ShopSummary[] = []
  for (let page = 1; page <= maxSearchPages; page++) {
    const result = await shopsService.searchShops({ page, pageSize: searchPageSize })
    shops.push(...result.items)
    if (result.items.length === 0 || shops.length >= result.total) break
  }
  return shops
}

function rankByDistance(shops: readonly ShopSummary[], position: Coordinates | undefined): AssistantShopResult[] {
  if (!position) return shops.map((shop) => ({ shop }))
  const measured = shops.map((shop) => ({
    shop,
    distanceKm: shop.coordinates ? distanceKm(position, shop.coordinates) : undefined,
  }))
  const located = measured.filter((result) => result.distanceKm !== undefined)
  const unlocated = measured.filter((result) => result.distanceKm === undefined)
  return [...located.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)), ...unlocated]
}

/** Quote prices never satisfy a cap; the others are compared on their lowest amount. */
function withinCap(service: Service, cap: number) {
  return service.price.type !== 'quote' && service.price.amount <= cap
}

function inCategory(service: Service, category: ServiceCategory, categories: readonly ServiceCategory[]) {
  return (
    service.categoryId === category.id ||
    categories.find((candidate) => candidate.id === service.categoryId)?.parentId === category.id
  )
}

/** The cheapest active service in the category (and its subcategories) that fits the cap, when there is one. */
function matchingService(
  services: readonly Service[],
  category: ServiceCategory,
  categories: readonly ServiceCategory[],
  cap: number | undefined,
) {
  return services
    .filter((service) => service.active && inCategory(service, category, categories))
    .filter((service) => cap === undefined || withinCap(service, cap))
    .sort((a, b) => {
      const price = (service: Service) => (service.price.type === 'quote' ? Infinity : service.price.amount)
      return price(a) - price(b)
    })[0]
}

function searchParamsFor(intent: FindIntent): ShopSearchParams {
  const params: ShopSearchParams = { pageSize: searchPageSize }
  if (intent.keywords.length > 0) params.q = intent.keywords.join(' ')
  if (intent.categorySlug) params.category = intent.categorySlug
  if (intent.areaSlug) params.area = intent.areaSlug
  if (intent.priceMax) params.priceMax = intent.priceMax
  if (intent.openNow) params.openNow = true
  return params
}

function greetingSuggestions(context: AssistantContext, interestIds: readonly ID[]) {
  const live = liveInterestCategories(context.categories)
  const picked = live.filter((category) => interestIds.includes(category.id))
  const chosen = picked.length > 0 ? picked : live
  return chosen.slice(0, maxSuggestions).map((category) => `Find a ${category.name} near me`)
}

export function createRuleEngine(deps: EngineDeps): AssistantEngine {
  async function find(intent: FindIntent, context: AssistantContext): Promise<AssistantReply> {
    const position = deps.getPosition()
    if (intent.nearMe && !position) {
      return {
        text: "I'd need your location to find shops near you. Share your location, or tell me which area you'd like to search in.",
        shops: [],
        suggestions: context.areas.slice(0, maxSuggestions).map((area) => `Shops in ${area.name}`),
      }
    }

    const found = await shopsService.searchShops(searchParamsFor(intent))
    let results = rankByDistance(found.items, position)
    let total = found.total

    const category = context.categories.find((candidate) => candidate.slug === intent.categorySlug)
    const needsServices = category && (intent.priceMax !== undefined || category.parentId)
    if (category && needsServices) {
      const checked = await Promise.all(
        results.slice(0, serviceCheckLimit).map(async (result) => {
          const services = await deps.getShopServices(result.shop.slug)
          return { ...result, service: matchingService(services, category, context.categories, intent.priceMax) }
        }),
      )
      if (intent.priceMax !== undefined) {
        // Only shops whose own service meets the cap are claimed to; the search can't see per-service prices by category.
        results = checked.filter((result) => result.service)
        total = results.length
      } else {
        results = [...checked, ...results.slice(serviceCheckLimit)]
      }
    }

    return composeFindReply(intent, results, total)
  }

  async function shopQuestion(slug: string, topic: 'hours' | 'prices' | 'policies'): Promise<AssistantReply> {
    try {
      const [shop, services] = await Promise.all([deps.getShop(slug), deps.getShopServices(slug)])
      return composeShopAnswer(topic, shop, services, deps.now?.())
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return {
          text: "I couldn't find that shop in the catalog any more. You can search for shops by service, area or price instead.",
          shops: [],
          suggestions: ['Show me shops near me', 'Salons open now'],
        }
      }
      throw error
    }
  }

  return {
    async reply(message) {
      try {
        const context = await deps.getContext()
        const intent = parseMessage(message, context)
        switch (intent.kind) {
          case 'find':
            return await find(intent, context)
          case 'shop_question':
            return await shopQuestion(intent.shopSlug, intent.topic)
          case 'greeting':
            return composeGreeting(greetingSuggestions(context, deps.getInterestCategoryIds()))
          case 'unknown':
            return composeUnknownReply(greetingSuggestions(context, deps.getInterestCategoryIds()))
        }
      } catch {
        return errorReply
      }
    },

    async greeting() {
      try {
        const context = await deps.getContext()
        return composeGreeting(greetingSuggestions(context, deps.getInterestCategoryIds()))
      } catch {
        return errorReply
      }
    },
  }
}

/** Real deps: the whole catalog prefetched once and cached for five minutes; position and interests come from the caller. */
export function createDefaultDeps(options: {
  getPosition: () => Coordinates | undefined
  getInterestCategoryIds: () => readonly ID[]
}): EngineDeps {
  let cached: { at: number; context: Promise<AssistantContext> } | undefined

  function getContext() {
    if (!cached || Date.now() - cached.at > contextTtlMs) {
      const context = Promise.all([catalogService.getCategories(), catalogService.getAreas(), fetchAllShops()]).then(
        ([categories, areas, shops]) => ({ categories, areas, shops }),
      )
      // A failed load must not be served for the next five minutes.
      context.catch(() => {
        cached = undefined
      })
      cached = { at: Date.now(), context }
    }
    return cached.context
  }

  return {
    getContext,
    getShop: (slug) => shopsService.getShop(slug),
    getShopServices: (slug) => shopsService.getShopServices(slug),
    getPosition: options.getPosition,
    getInterestCategoryIds: options.getInterestCategoryIds,
  }
}
