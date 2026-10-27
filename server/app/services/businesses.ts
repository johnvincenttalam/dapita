import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Area from '#models/area'
import Business from '#models/business'
import Category from '#models/category'
import Service from '#models/service'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { validateWith } from '#helpers/validate'
import { toAreaData, toCategoryData } from '#services/catalog'
import { toServiceData } from '#services/shops'
import {
  businessProfileSchema,
  closureSchema,
  listingChecklist,
  policiesSchema,
  toDateKey,
  weeklyHoursSchema,
  type Business as BusinessData,
  type ID,
} from '#shared/domain'

/**
 * The owner's listing (MER-01, MER-03, BKG-06), ported from the mock in
 * src/services/merchant-business.service.ts: input goes through the form's own
 * schemas, and the slug never changes, so shared links keep working after a rename.
 * Callers check membership first (`requireMember`).
 */

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

const businessNotFound = () => new ApiError('We couldn’t find that business.', 404)

const listingCategories = (client?: TransactionClientContract) =>
  Category.query({ client })
    .whereNull('parentId')
    .where('status', 'active')
    .orderBy('sortOrder', 'asc')

/** The owner's listing, with what the profile form offers to choose from (`BusinessProfile`). */
export async function getBusinessProfile(businessId: ID) {
  const business = await Business.find(businessId)
  if (!business) throw businessNotFound()
  const [areas, categories] = await Promise.all([
    Area.query().orderBy('name', 'asc'),
    listingCategories(),
  ])
  return {
    business: toBusinessData(business),
    areas: areas.map(toAreaData),
    categories: categories.map(toCategoryData),
  }
}

/** Locks the listing, applies the change and saves it, so concurrent edits queue up instead of overwriting each other. */
async function change(
  businessId: ID,
  apply: (business: Business, trx: TransactionClientContract) => Promise<void> | void
) {
  const business = await db.transaction(async (trx) => {
    const locked = await Business.query({ client: trx }).where('id', businessId).forUpdate().first()
    if (!locked) throw businessNotFound()
    await apply(locked, trx)
    locked.updatedAt = new Date().toISOString()
    await locked.save()
    return locked
  })
  return toBusinessData(business)
}

export function updateProfile(businessId: ID, input: unknown) {
  const valid = validateWith(businessProfileSchema, input)
  return change(businessId, async (business, trx) => {
    if (!(await Area.find(valid.areaId, { client: trx }))) {
      throw new ApiError('Choose an area from the list.', 422)
    }
    const categories = await listingCategories(trx)
    const allowed = new Set(categories.map((category) => category.id))
    if (!valid.categoryIds.every((id) => allowed.has(id))) {
      throw new ApiError('Choose categories from the list.', 422)
    }
    business.merge({
      name: valid.name,
      description: valid.description,
      categoryIds: valid.categoryIds,
      areaId: valid.areaId,
      address: valid.address,
      phone: valid.phone || null,
    })
  })
}

export function updateHours(businessId: ID, input: unknown) {
  const valid = validateWith(weeklyHoursSchema, input)
  return change(businessId, (business) => {
    business.hours = valid
  })
}

export function addClosure(businessId: ID, input: unknown) {
  const valid = validateWith(closureSchema, input)
  if (valid.endDate < toDateKey(new Date())) {
    throw new ApiError('That closure has already passed. Choose today or a later date.', 422)
  }
  return change(businessId, (business) => {
    business.closures = [
      ...business.closures,
      {
        id: newId('cl'),
        startDate: valid.startDate,
        endDate: valid.endDate,
        ...(valid.reason ? { reason: valid.reason } : {}),
      },
    ].sort((a, b) => a.startDate.localeCompare(b.startDate))
  })
}

export function deleteClosure(businessId: ID, closureId: ID) {
  return change(businessId, (business) => {
    if (!business.closures.some((closure) => closure.id === closureId)) {
      throw new ApiError('We couldn’t find that closure.', 404)
    }
    business.closures = business.closures.filter((closure) => closure.id !== closureId)
  })
}

/** A change to the wording starts a new policy version; bookings keep the version agreed. */
export function updatePolicies(businessId: ID, input: unknown) {
  const valid = validateWith(policiesSchema, input)
  return change(businessId, (business) => {
    const current = business.policies
    const changed =
      current.cancellation !== valid.cancellation ||
      (current.noShow ?? '') !== valid.noShow ||
      (current.deposit ?? '') !== valid.deposit
    if (!changed) return
    business.policies = {
      cancellation: valid.cancellation,
      ...(valid.noShow ? { noShow: valid.noShow } : {}),
      ...(valid.deposit ? { deposit: valid.deposit } : {}),
      version: current.version + 1,
    }
  })
}

/** Sends a finished draft (or one with requested changes) to admin review. It stays private until approved. */
export function submitForReview(businessId: ID) {
  return change(businessId, async (business, trx) => {
    if (business.status === 'pending_review') {
      throw new ApiError('Your listing is already waiting for review.', 409)
    }
    if (business.status !== 'draft' && business.status !== 'changes_requested') {
      throw new ApiError(
        business.status === 'approved'
          ? 'Your listing is already live.'
          : 'This listing can’t be submitted.',
        409
      )
    }
    const services = await Service.query({ client: trx }).where('businessId', business.id)
    const { items, ready } = listingChecklist(toBusinessData(business), services.map(toServiceData))
    if (!ready) {
      const todo = items.filter((item) => !item.done).map((item) => item.label.toLowerCase())
      const list = todo.length > 1 ? `${todo.slice(0, -1).join(', ')} and ${todo.at(-1)}` : todo[0]
      throw new ApiError(`Finish these first: ${list}.`, 422)
    }
    business.status = 'pending_review'
  })
}
