import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Booking from '#models/booking'
import Business from '#models/business'
import Category from '#models/category'
import Service from '#models/service'
import StaffMember from '#models/staff_member'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { validateWith } from '#helpers/validate'
import { toCategoryData } from '#services/catalog'
import { toServiceData } from '#services/shops'
import { serviceSchema, type ID } from '#shared/domain'

/**
 * The merchant's service menu (MER-02), ported from the mock in
 * src/services/merchant-services.service.ts: input goes through the form's schema,
 * names are unique per menu, and booked services are hidden rather than deleted so
 * booking history stays intact. Callers check membership first (`requireMember`).
 */

export type MoveDirection = 'up' | 'down'

type ServiceInput = ReturnType<typeof serviceSchema.parse>

const serviceNotFound = () => new ApiError('We couldn’t find that service.', 404)

/**
 * Locks the listing for the change, so two edits can't both pass the duplicate-name
 * check or take the same place in the menu.
 */
function withMenu<T>(
  businessId: ID,
  run: (business: Business, trx: TransactionClientContract) => Promise<T>
) {
  return db.transaction(async (trx) => {
    const business = await Business.query({ client: trx })
      .where('id', businessId)
      .forUpdate()
      .first()
    if (!business) throw new ApiError('We couldn’t find that business.', 404)
    return run(business, trx)
  })
}

const menuOf = (businessId: ID, client?: TransactionClientContract) =>
  Service.query({ client }).where('businessId', businessId).orderBy('sortOrder', 'asc')

/** Subcategories of the business's categories (a category with none stands for itself), plus any already in use. */
async function categoriesFor(
  business: Business,
  menu: Service[],
  client?: TransactionClientContract
) {
  const all = await Category.query({ client })
  const used = new Set(menu.map((service) => service.categoryId))
  const parentOrder = (category: Category) =>
    business.categoryIds.indexOf(category.parentId ?? category.id)
  return all
    .filter((category) => {
      if (used.has(category.id)) return true
      if (category.status === 'hidden') return false
      if (category.parentId) return business.categoryIds.includes(category.parentId)
      return (
        business.categoryIds.includes(category.id) &&
        !all.some((other) => other.parentId === category.id)
      )
    })
    .sort((a, b) => parentOrder(a) - parentOrder(b) || a.sortOrder - b.sortOrder)
}

const normalizeName = (name: string) =>
  name.replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()

async function checkInput(
  business: Business,
  menu: Service[],
  input: unknown,
  trx: TransactionClientContract,
  exceptId?: ID
) {
  const valid = validateWith(serviceSchema, input)
  const categories = await categoriesFor(business, menu, trx)
  if (!categories.some((category) => category.id === valid.categoryId)) {
    throw new ApiError('Choose one of your business’s categories.', 422)
  }
  const duplicate = menu.find(
    (service) =>
      service.id !== exceptId && normalizeName(service.name) === normalizeName(valid.name)
  )
  if (duplicate) {
    throw new ApiError(`You already have a service called “${duplicate.name}”.`, 409)
  }
  return valid
}

/** The stored shape: optional text is null rather than an empty string. */
function fromInput(input: ServiceInput) {
  return {
    name: input.name,
    categoryId: input.categoryId,
    description: input.description || null,
    requirements: input.requirements || null,
    price: input.price,
    durationMinutes: input.durationMinutes,
    bufferMinutes: input.bufferMinutes,
    featured: input.featured,
    active: input.active,
  }
}

/** The whole menu, hidden services included, and the categories a service can go under (`ServiceMenu`). */
export async function getServiceMenu(businessId: ID) {
  const business = await Business.find(businessId)
  if (!business) throw new ApiError('We couldn’t find that business.', 404)
  const menu = await menuOf(businessId)
  const categories = await categoriesFor(business, menu)
  return {
    services: menu.map(toServiceData),
    categories: categories.map(toCategoryData),
    shopSlug: business.slug,
  }
}

export function createService(businessId: ID, input: unknown) {
  return withMenu(businessId, async (business, trx) => {
    const menu = await menuOf(businessId, trx)
    const valid = await checkInput(business, menu, input, trx)
    const service = await Service.create(
      {
        id: newId('svc'),
        businessId,
        sortOrder: (menu.at(-1)?.sortOrder ?? -1) + 1,
        photoUrl: null,
        ...fromInput(valid),
      },
      { client: trx }
    )
    return toServiceData(service)
  })
}

export function updateService(businessId: ID, serviceId: ID, input: unknown) {
  return withMenu(businessId, async (business, trx) => {
    const menu = await menuOf(businessId, trx)
    const service = menu.find((candidate) => candidate.id === serviceId)
    if (!service) throw serviceNotFound()
    const valid = await checkInput(business, menu, input, trx, serviceId)
    service.merge(fromInput(valid))
    await service.save()
    return toServiceData(service)
  })
}

/** Swaps the service with its neighbour in the same category. Returns the menu in its new order. */
export function moveService(businessId: ID, serviceId: ID, direction: MoveDirection) {
  return withMenu(businessId, async (_business, trx) => {
    const menu = await menuOf(businessId, trx)
    const service = menu.find((candidate) => candidate.id === serviceId)
    if (!service) throw serviceNotFound()
    const siblings = menu.filter((candidate) => candidate.categoryId === service.categoryId)
    const index = siblings.indexOf(service)
    const neighbour = siblings[direction === 'up' ? index - 1 : index + 1]
    if (neighbour) {
      ;[service.sortOrder, neighbour.sortOrder] = [neighbour.sortOrder, service.sortOrder]
      await service.save()
      await neighbour.save()
    }
    return menu.toSorted((a, b) => a.sortOrder - b.sortOrder).map(toServiceData)
  })
}

/** Only for services nobody has booked; booked ones are hidden instead. */
export function deleteService(businessId: ID, serviceId: ID) {
  return withMenu(businessId, async (_business, trx) => {
    const service = await Service.query({ client: trx })
      .where({ id: serviceId, businessId })
      .first()
    if (!service) throw serviceNotFound()
    const booked = await Booking.query({ client: trx }).where('serviceId', serviceId).first()
    if (booked) {
      throw new ApiError(
        'Customers have booked this service, so it can’t be deleted. Hide it instead.',
        409
      )
    }
    const staff = await StaffMember.query({ client: trx }).where('businessId', businessId)
    for (const member of staff) {
      if (!member.serviceIds.includes(serviceId)) continue
      member.serviceIds = member.serviceIds.filter((id) => id !== serviceId)
      await member.save()
    }
    await service.delete()
  })
}
