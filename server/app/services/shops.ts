import Area from '#models/area'
import Business from '#models/business'
import Category from '#models/category'
import Service from '#models/service'
import StaffMember from '#models/staff_member'
import ApiError from '#exceptions/api_error'
import {
  getOpenStatus,
  type Service as ServiceData,
  type ShopDetails,
  type ShopSummary,
  type StaffMember as StaffData,
} from '#shared/domain'

/**
 * Public discovery (doc §7.4), ported from the mock in src/services/shops.service.ts:
 * only approved listings are public, and nothing is inferred that the data
 * doesn't contain. The pilot has a few dozen listings, so search filters in
 * memory; move it to SQL (or full-text search) as the catalogue grows.
 */

export type ShopSort = 'recommended' | 'price_low' | 'name'

export interface ShopSearchParams {
  q?: string
  category?: string
  area?: string
  priceMax?: number
  openNow?: boolean
  sort?: ShopSort
  page?: number
  pageSize?: number
}

export const DEFAULT_PAGE_SIZE = 12

export function toServiceData(service: Service): ServiceData {
  return {
    id: service.id,
    businessId: service.businessId,
    categoryId: service.categoryId,
    name: service.name,
    description: service.description ?? undefined,
    requirements: service.requirements ?? undefined,
    price: service.price,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    photoUrl: service.photoUrl ?? undefined,
    featured: service.featured,
    active: service.active,
    sortOrder: service.sortOrder,
  }
}

function toStaffData(member: StaffMember): StaffData {
  return {
    id: member.id,
    businessId: member.businessId,
    displayName: member.displayName,
    title: member.title ?? undefined,
    avatarUrl: member.avatarUrl ?? undefined,
    serviceIds: member.serviceIds,
    active: member.active,
  }
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase()
}

function lowestPrice(services: Service[]) {
  const amounts = services.flatMap((service) =>
    service.price.type === 'quote' ? [] : [service.price.amount]
  )
  return amounts.length ? Math.min(...amounts) : undefined
}

/** Everything a listing card or search needs, loaded once per request. */
async function loadPublicCatalog() {
  const [businesses, services, categories, areas] = await Promise.all([
    Business.query().where('status', 'approved'),
    Service.query().where('active', true).orderBy('sortOrder', 'asc'),
    Category.all(),
    Area.all(),
  ])
  const servicesOf = (businessId: string) =>
    services.filter((service) => service.businessId === businessId)
  return { businesses, servicesOf, categories, areas }
}

type Catalog = Awaited<ReturnType<typeof loadPublicCatalog>>

function toSummary(catalog: Catalog, business: Business): ShopSummary {
  const area = catalog.areas.find((candidate) => candidate.id === business.areaId)
  const services = catalog.servicesOf(business.id)
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    categoryIds: business.categoryIds,
    area: { id: business.areaId, slug: area?.slug ?? '', name: area?.name ?? '' },
    address: business.address,
    coordinates: business.coordinates ?? undefined,
    coverPhoto: business.coverPhoto,
    rating: business.rating ?? undefined,
    verified: business.verified,
    featured: business.featured,
    bookingMethod: business.bookingMethod,
    hours: business.hours,
    closures: business.closures,
    priceFrom: lowestPrice(services),
    serviceCount: services.length,
  }
}

/** Words a customer might search for: names, description, area, categories and services. */
function searchText(catalog: Catalog, business: Business) {
  const services = catalog.servicesOf(business.id)
  const categoryIds = new Set([
    ...business.categoryIds,
    ...services.map((service) => service.categoryId),
  ])
  const categories = catalog.categories
    .filter((category) => categoryIds.has(category.id))
    .map((category) => category.name)
  const area = catalog.areas.find((candidate) => candidate.id === business.areaId)?.name ?? ''
  return normalize(
    [business.name, business.description, area, ...categories, ...services.map((s) => s.name)].join(
      ' '
    )
  )
}

function matchesCategory(catalog: Catalog, business: Business, slug: string) {
  const category = catalog.categories.find((candidate) => candidate.slug === slug)
  if (!category) return false
  const services = catalog.servicesOf(business.id)
  if (category.parentId) return services.some((service) => service.categoryId === category.id)
  return (
    business.categoryIds.includes(category.id) ||
    services.some(
      (service) =>
        catalog.categories.find((c) => c.id === service.categoryId)?.parentId === category.id
    )
  )
}

const sorters: Record<ShopSort, (a: ShopSummary, b: ShopSummary) => number> = {
  recommended: (a, b) =>
    Number(b.featured) - Number(a.featured) ||
    Number(b.verified) - Number(a.verified) ||
    a.name.localeCompare(b.name),
  price_low: (a, b) =>
    (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
}

export async function searchShops(params: ShopSearchParams, now = new Date()) {
  const catalog = await loadPublicCatalog()
  const tokens = normalize(params.q ?? '')
    .split(/\s+/)
    .filter(Boolean)
  const results = catalog.businesses
    .filter((business) => {
      if (tokens.length) {
        const text = searchText(catalog, business)
        if (!tokens.every((token) => text.includes(token))) return false
      }
      if (params.category && !matchesCategory(catalog, business, params.category)) return false
      if (
        params.area &&
        catalog.areas.find((area) => area.id === business.areaId)?.slug !== params.area
      ) {
        return false
      }
      if (params.openNow && !getOpenStatus(business.hours, business.closures, now).isOpen)
        return false
      return true
    })
    .map((business) => toSummary(catalog, business))
    .filter(
      (shop) =>
        params.priceMax === undefined ||
        (shop.priceFrom !== undefined && shop.priceFrom <= params.priceMax)
    )
    .sort(sorters[params.sort ?? 'recommended'])

  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const page = Math.max(1, params.page ?? 1)
  return {
    items: results.slice((page - 1) * pageSize, page * pageSize),
    total: results.length,
    page,
    pageSize,
  }
}

export async function getFeaturedShops() {
  const catalog = await loadPublicCatalog()
  return catalog.businesses
    .filter((business) => business.featured)
    .map((business) => toSummary(catalog, business))
    .sort(sorters.recommended)
}

async function findPublicBusiness(slug: string) {
  const business = await Business.query().where({ slug, status: 'approved' }).first()
  if (!business) throw new ApiError('This shop isn’t available. It may have moved or closed.', 404)
  return business
}

export async function getShop(slug: string): Promise<ShopDetails> {
  const business = await findPublicBusiness(slug)
  const catalog = await loadPublicCatalog()
  const { area, priceFrom, serviceCount } = toSummary(catalog, business)
  // Owner, status and moderation notes are between Dapita and the owner, never public.
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    description: business.description,
    categoryIds: business.categoryIds,
    address: business.address,
    coordinates: business.coordinates ?? undefined,
    phone: business.phone ?? undefined,
    bookingMethod: business.bookingMethod,
    verified: business.verified,
    featured: business.featured,
    hours: business.hours,
    closures: business.closures,
    policies: business.policies,
    photos: business.photos,
    rating: business.rating ?? undefined,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
    area,
    priceFrom,
    serviceCount,
  }
}

export async function getShopServices(slug: string) {
  const business = await findPublicBusiness(slug)
  const services = await Service.query()
    .where({ businessId: business.id, active: true })
    .orderBy('sortOrder', 'asc')
  return services.map(toServiceData)
}

export async function getShopStaff(slug: string) {
  const business = await findPublicBusiness(slug)
  const staff = await StaffMember.query().where({ businessId: business.id, active: true })
  return staff.map(toStaffData)
}
