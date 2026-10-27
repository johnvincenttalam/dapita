import db from '@adonisjs/lucid/services/db'
import Area from '#models/area'
import Business from '#models/business'
import Category from '#models/category'
import ModerationAction from '#models/moderation_action'
import Service from '#models/service'
import User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { validateWith } from '#helpers/validate'
import { requireStaff } from '#services/accounts'
import { toBusinessData } from '#services/businesses'
import { toServiceData } from '#services/shops'
import {
  availableModerationActions,
  businessStatusLabels,
  moderationLabels,
  moderationRules,
  moderationSchema,
  type ID,
  type MerchantListItem,
  type MerchantReview,
  type ModerationAction as ModerationActionData,
} from '#shared/domain'

/**
 * Listing review and moderation (ADM-01) and featured listings (ADM-02), ported from
 * the mock in src/services/admin.service.ts. Administrators only; every decision is
 * recorded with who, when and why.
 */

const listingNotFound = () => new ApiError('We couldn’t find that listing.', 404)

/** Names and counts the merchant lists show, loaded once for a set of listings. */
async function loadContext(businesses: Business[]) {
  const ownerIds = [...new Set(businesses.map((business) => business.ownerId))]
  const [areas, categories, owners, counts] = await Promise.all([
    Area.all(),
    Category.all(),
    ownerIds.length ? User.query().whereIn('id', ownerIds) : [],
    db
      .from('services')
      .select('business_id')
      .count('* as total')
      .whereIn(
        'business_id',
        businesses.map((business) => business.id)
      )
      .groupBy('business_id'),
  ])
  return {
    areaName: (id: ID) => areas.find((area) => area.id === id)?.name ?? '',
    categoryNames: (ids: ID[]) =>
      ids.flatMap((id) => categories.find((category) => category.id === id)?.name ?? []),
    owner: (business: Business) => {
      const user = owners.find((candidate) => candidate.id === business.ownerId)
      return { id: business.ownerId, name: user?.name ?? 'Owner not on record', email: user?.email }
    },
    serviceCount: (id: ID) =>
      Number(
        (counts as { business_id: string; total: string | number }[]).find(
          (row) => row.business_id === id
        )?.total ?? 0
      ),
  }
}

type Context = Awaited<ReturnType<typeof loadContext>>

function toListItem(context: Context, business: Business): MerchantListItem {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    status: business.status,
    areaName: context.areaName(business.areaId),
    categoryNames: context.categoryNames(business.categoryIds),
    ownerName: context.owner(business).name,
    serviceCount: context.serviceCount(business.id),
    featured: business.featured,
    updatedAt: business.updatedAt,
  }
}

function toActionData(action: ModerationAction): ModerationActionData {
  return {
    id: action.id,
    businessId: action.businessId,
    action: action.action,
    from: action.fromStatus,
    to: action.toStatus,
    reason: action.reason,
    actorId: action.actorId,
    actorName: action.actorName,
    at: action.at,
  }
}

async function toReview(business: Business): Promise<MerchantReview> {
  const [context, services, history] = await Promise.all([
    loadContext([business]),
    Service.query().where('businessId', business.id).orderBy('sortOrder', 'asc'),
    ModerationAction.query().where('businessId', business.id).orderBy('at', 'desc'),
  ])
  return {
    business: toBusinessData(business),
    areaName: context.areaName(business.areaId),
    categoryNames: context.categoryNames(business.categoryIds),
    services: services.map(toServiceData),
    owner: context.owner(business),
    history: history.map(toActionData),
    availableActions: availableModerationActions(business.status),
  }
}

export async function listMerchants(admin: User) {
  requireStaff(admin, ['admin'])
  const businesses = await Business.query().orderBy('updatedAt', 'desc')
  const context = await loadContext(businesses)
  return businesses.map((business) => toListItem(context, business))
}

export async function getMerchantReview(admin: User, businessId: ID) {
  requireStaff(admin, ['admin'])
  const business = await Business.find(businessId)
  if (!business) throw listingNotFound()
  return toReview(business)
}

export async function moderateMerchant(admin: User, businessId: ID, input: unknown) {
  requireStaff(admin, ['admin'])
  const { action, reason } = validateWith(moderationSchema, input)
  const business = await db.transaction(async (trx) => {
    const locked = await Business.query({ client: trx }).where('id', businessId).forUpdate().first()
    if (!locked) throw listingNotFound()
    const rule = moderationRules[action]
    if (!rule.from.includes(locked.status)) {
      const state =
        locked.status === 'approved' ? 'live' : businessStatusLabels[locked.status].toLowerCase()
      throw new ApiError(
        `This listing can’t be ${moderationLabels[action].done.toLowerCase()} while it’s ${state}.`,
        409
      )
    }
    const now = new Date().toISOString()
    await ModerationAction.create(
      {
        id: newId('mod'),
        businessId,
        action,
        fromStatus: locked.status,
        toStatus: rule.to,
        reason,
        actorId: admin.id,
        actorName: admin.name,
        at: now,
      },
      { client: trx }
    )
    // The owner sees why it was sent back, rejected or suspended; a listing that goes live has nothing to fix.
    locked.merge({
      status: rule.to,
      moderationNote: rule.to === 'approved' ? null : reason,
      updatedAt: now,
    })
    await locked.save()
    return locked
  })
  return toReview(business)
}

/** Only live listings can be featured. */
export async function setFeatured(admin: User, businessId: ID, featured: boolean) {
  requireStaff(admin, ['admin'])
  const business = await Business.find(businessId)
  if (!business) throw listingNotFound()
  if (featured && business.status !== 'approved') {
    throw new ApiError('Only live listings can be featured.', 422)
  }
  business.featured = featured
  await business.save()
  return toListItem(await loadContext([business]), business)
}
