import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { getOpenStatus } from '@/lib/opening-hours'
import { readMockDb, type MockDb } from '@/services/mock/db'
import { delay } from '@/services/mock/utils'
import type { Paginated } from '@/types/api'
import type { Business, Service, ShopDetails, ShopSummary, StaffMember } from '@/types/business'

export type ShopSort = 'recommended' | 'price_low' | 'name'

/** Query for `GET /shops` (plan §7.3). Map bounds and coordinates join when the map view lands (step 10). */
export interface ShopSearchParams {
  q?: string
  /** Category or subcategory slug. */
  category?: string
  /** Area slug. */
  area?: string
  /** Only shops with at least one service quoted at or below this amount. */
  priceMax?: number
  openNow?: boolean
  sort?: ShopSort
  page?: number
  pageSize?: number
}

export interface ShopsService {
  searchShops: (params: ShopSearchParams) => Promise<Paginated<ShopSummary>>
  getFeaturedShops: () => Promise<ShopSummary[]>
  getShop: (slug: string) => Promise<ShopDetails>
  /** Active services, in the merchant's order. */
  getShopServices: (slug: string) => Promise<Service[]>
  /** Active staff; empty when the shop doesn't keep staff records. */
  getShopStaff: (slug: string) => Promise<StaffMember[]>
}

const shopPath = (slug: string) => `/shops/${encodeURIComponent(slug)}`

const httpShopsService: ShopsService = {
  searchShops: (params) => apiClient.get<Paginated<ShopSummary>>('/shops', { query: { ...params } }),
  getFeaturedShops: () => apiClient.get<ShopSummary[]>('/shops/featured'),
  getShop: (slug) => apiClient.get<ShopDetails>(shopPath(slug)),
  getShopServices: (slug) => apiClient.get<Service[]>(`${shopPath(slug)}/services`),
  getShopStaff: (slug) => apiClient.get<StaffMember[]>(`${shopPath(slug)}/staff`),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Searches the in-browser database the way the documented API should: only
// approved listings are public (doc §7.4), and nothing is inferred that the
// data doesn't contain.

export const DEFAULT_PAGE_SIZE = 12

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase()
}

function lowestPrice(services: Service[]) {
  const amounts = services.flatMap((service) => (service.price.type === 'quote' ? [] : [service.price.amount]))
  return amounts.length ? Math.min(...amounts) : undefined
}

function publicServices(db: MockDb, businessId: string) {
  return db.services
    .filter((service) => service.businessId === businessId && service.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export function toSummary(db: MockDb, business: Business): ShopSummary {
  const area = db.areas.find((candidate) => candidate.id === business.areaId)
  const services = publicServices(db, business.id)
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    categoryIds: business.categoryIds,
    area: { id: business.areaId, slug: area?.slug ?? '', name: area?.name ?? '' },
    address: business.address,
    coordinates: business.coordinates,
    coverPhoto: business.photos.find((photo) => photo.kind === 'cover'),
    rating: business.rating,
    verified: business.verified,
    featured: business.featured,
    bookingMethod: business.bookingMethod,
    hours: business.hours,
    closures: business.closures,
    priceFrom: lowestPrice(services),
    serviceCount: services.length,
  }
}

function findPublicBusiness(db: MockDb, slug: string) {
  const business = db.businesses.find((candidate) => candidate.slug === slug && candidate.status === 'approved')
  if (!business) throw new ApiError('This shop isn’t available. It may have moved or closed.', 404)
  return business
}

/** Words a customer might search for: names, description, area, categories and services. */
function searchText(db: MockDb, business: Business) {
  const services = publicServices(db, business.id)
  const categoryIds = new Set([...business.categoryIds, ...services.map((service) => service.categoryId)])
  const categories = db.categories.filter((category) => categoryIds.has(category.id)).map((category) => category.name)
  const area = db.areas.find((candidate) => candidate.id === business.areaId)?.name ?? ''
  return normalize([business.name, business.description, area, ...categories, ...services.map((s) => s.name)].join(' '))
}

function matchesCategory(db: MockDb, business: Business, slug: string) {
  const category = db.categories.find((candidate) => candidate.slug === slug)
  if (!category) return false
  const services = publicServices(db, business.id)
  if (category.parentId) return services.some((service) => service.categoryId === category.id)
  return (
    business.categoryIds.includes(category.id) ||
    services.some((service) => db.categories.find((c) => c.id === service.categoryId)?.parentId === category.id)
  )
}

const sorters: Record<ShopSort, (a: ShopSummary, b: ShopSummary) => number> = {
  recommended: (a, b) =>
    Number(b.featured) - Number(a.featured) || Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name),
  price_low: (a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
}

export function searchMockShops(db: MockDb, params: ShopSearchParams, now = new Date()): Paginated<ShopSummary> {
  const tokens = normalize(params.q ?? '')
    .split(/\s+/)
    .filter(Boolean)
  const results = db.businesses
    .filter((business) => business.status === 'approved')
    .filter((business) => {
      if (tokens.length) {
        const text = searchText(db, business)
        if (!tokens.every((token) => text.includes(token))) return false
      }
      if (params.category && !matchesCategory(db, business, params.category)) return false
      if (params.area && db.areas.find((area) => area.id === business.areaId)?.slug !== params.area) return false
      if (params.openNow && !getOpenStatus(business.hours, business.closures, now).isOpen) return false
      return true
    })
    .map((business) => toSummary(db, business))
    .filter(
      (shop) => params.priceMax === undefined || (shop.priceFrom !== undefined && shop.priceFrom <= params.priceMax),
    )
    .sort(sorters[params.sort ?? 'recommended'])

  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const page = Math.max(1, params.page ?? 1)
  return { items: results.slice((page - 1) * pageSize, page * pageSize), total: results.length, page, pageSize }
}

const mockShopsService: ShopsService = {
  async searchShops(params) {
    await delay(350)
    return searchMockShops(readMockDb(), params)
  },
  async getFeaturedShops() {
    await delay(300)
    const db = readMockDb()
    return db.businesses
      .filter((business) => business.status === 'approved' && business.featured)
      .map((business) => toSummary(db, business))
      .sort(sorters.recommended)
  },
  async getShop(slug) {
    await delay(300)
    const db = readMockDb()
    const found = findPublicBusiness(db, slug)
    // Moderation notes are between Dapita and the owner, never public.
    const { ownerId: _owner, status: _status, areaId: _area, moderationNote: _note, ...business } = found
    const { area, priceFrom, serviceCount } = toSummary(db, found)
    return { ...business, area, priceFrom, serviceCount }
  },
  async getShopServices(slug) {
    await delay(300)
    const db = readMockDb()
    return publicServices(db, findPublicBusiness(db, slug).id)
  },
  async getShopStaff(slug) {
    await delay(300)
    const db = readMockDb()
    const business = findPublicBusiness(db, slug)
    return db.staff.filter((member) => member.businessId === business.id && member.active)
  },
}

export const shopsService: ShopsService = env.useMocks ? mockShopsService : httpShopsService
