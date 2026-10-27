import Area from '#models/area'
import Business from '#models/business'
import Category from '#models/category'
import ApiError from '#exceptions/api_error'
import { toAreaData, toCategoryData } from '#services/catalog'
import type { Business as BusinessData, ID } from '#shared/domain'

export function toBusinessData(business: Business): BusinessData {
  return {
    id: business.id,
    slug: business.slug,
    ownerId: business.ownerId,
    name: business.name,
    description: business.description,
    categoryIds: business.categoryIds,
    areaId: business.areaId,
    address: business.address,
    coordinates: business.coordinates ?? undefined,
    phone: business.phone ?? undefined,
    status: business.status,
    bookingMethod: business.bookingMethod,
    verified: business.verified,
    featured: business.featured,
    hours: business.hours,
    closures: business.closures,
    policies: business.policies,
    photos: business.photos,
    rating: business.rating ?? undefined,
    moderationNote: business.moderationNote ?? undefined,
    createdAt: business.createdAt,
    updatedAt: business.updatedAt,
  }
}

/** The owner's listing, with what the profile form offers to choose from (`BusinessProfile`). */
export async function getBusinessProfile(businessId: ID) {
  const business = await Business.find(businessId)
  if (!business) throw new ApiError('We couldn’t find that business.', 404)
  const [areas, categories] = await Promise.all([
    Area.query().orderBy('name', 'asc'),
    Category.query().whereNull('parentId').where('status', 'active').orderBy('sortOrder', 'asc'),
  ])
  return {
    business: toBusinessData(business),
    areas: areas.map(toAreaData),
    categories: categories.map(toCategoryData),
  }
}
