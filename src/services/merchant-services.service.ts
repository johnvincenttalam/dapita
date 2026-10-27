import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { serviceSchema, type ServiceInput } from '@/schemas/service'
import { readMockDb, updateMockDb, type MockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { createMockId, delay } from '@/services/mock/utils'
import type { Service } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'
import type { ID } from '@/types/common'

/** The merchant's whole menu, hidden services included, and the categories a service can go under. */
export interface ServiceMenu {
  services: Service[]
  categories: ServiceCategory[]
  /** The public shop page, so the owner can check what customers see. */
  shopSlug: string
}

export type MoveDirection = 'up' | 'down'

export interface MerchantServicesService {
  getServiceMenu: (businessId: ID) => Promise<ServiceMenu>
  createService: (businessId: ID, input: ServiceInput) => Promise<Service>
  updateService: (businessId: ID, serviceId: ID, input: ServiceInput) => Promise<Service>
  /** Swaps the service with its neighbour in the same category. Returns the menu in its new order. */
  moveService: (businessId: ID, serviceId: ID, direction: MoveDirection) => Promise<Service[]>
  /** Only for services nobody has booked; booked ones are hidden instead, so booking history stays intact. */
  deleteService: (businessId: ID, serviceId: ID) => Promise<void>
}

// Endpoints from docs/implementation-plan.md §7.3.
const servicesPath = (businessId: ID) => `/merchant/businesses/${encodeURIComponent(businessId)}/services`
const servicePath = (businessId: ID, serviceId: ID) => `${servicesPath(businessId)}/${encodeURIComponent(serviceId)}`

const httpMerchantServicesService: MerchantServicesService = {
  getServiceMenu: (businessId) => apiClient.get<ServiceMenu>(servicesPath(businessId)),
  createService: (businessId, input) => apiClient.post<Service>(servicesPath(businessId), input),
  updateService: (businessId, serviceId, input) => apiClient.put<Service>(servicePath(businessId, serviceId), input),
  moveService: (businessId, serviceId, direction) =>
    apiClient.post<Service[]>(`${servicePath(businessId, serviceId)}/move`, { direction }),
  deleteService: (businessId, serviceId) => apiClient.delete<void>(servicePath(businessId, serviceId)),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Validates like the server would: only members edit their own menu, input goes
// through the same schema as the form, and bookings keep their price snapshot.

function requireMember(businessId: ID) {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  if (!user.memberships.some((membership) => membership.businessId === businessId)) {
    throw new ApiError('You don’t have access to this business.', 403)
  }
}

function validate(input: ServiceInput): ServiceInput {
  const result = serviceSchema.safeParse(input)
  if (!result.success) throw new ApiError(result.error.issues[0]?.message ?? 'Check the service details.', 422)
  return result.data
}

const menuOf = (db: MockDb, businessId: ID) =>
  db.services.filter((service) => service.businessId === businessId).sort((a, b) => a.sortOrder - b.sortOrder)

/** Subcategories of the business's categories (a category with none stands for itself), plus any already in use. */
function categoriesFor(db: MockDb, businessId: ID): ServiceCategory[] {
  const business = db.businesses.find((candidate) => candidate.id === businessId)
  if (!business) throw new ApiError('We couldn’t find that business.', 404)
  const used = new Set(menuOf(db, businessId).map((service) => service.categoryId))
  const parentOrder = (category: ServiceCategory) => business.categoryIds.indexOf(category.parentId ?? category.id)
  return db.categories
    .filter((category) => {
      if (used.has(category.id)) return true
      if (category.status === 'hidden') return false
      if (category.parentId) return business.categoryIds.includes(category.parentId)
      return (
        business.categoryIds.includes(category.id) && !db.categories.some((other) => other.parentId === category.id)
      )
    })
    .sort((a, b) => parentOrder(a) - parentOrder(b) || a.sortOrder - b.sortOrder)
}

const normalizeName = (name: string) => name.replace(/[’']/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()

function checkInput(db: MockDb, businessId: ID, input: ServiceInput, exceptId?: ID) {
  const valid = validate(input)
  if (!categoriesFor(db, businessId).some((category) => category.id === valid.categoryId)) {
    throw new ApiError('Choose one of your business’s categories.', 422)
  }
  const duplicate = menuOf(db, businessId).find(
    (service) => service.id !== exceptId && normalizeName(service.name) === normalizeName(valid.name),
  )
  if (duplicate) throw new ApiError(`You already have a service called “${duplicate.name}”.`, 409)
  return valid
}

function findService(db: MockDb, businessId: ID, serviceId: ID) {
  const service = db.services.find((candidate) => candidate.id === serviceId && candidate.businessId === businessId)
  if (!service) throw new ApiError('We couldn’t find that service.', 404)
  return service
}

/** The stored shape: optional text is omitted rather than kept as empty strings. */
function fromInput(input: ServiceInput): Omit<Service, 'id' | 'businessId' | 'sortOrder' | 'photoUrl'> {
  return {
    name: input.name,
    categoryId: input.categoryId,
    description: input.description || undefined,
    requirements: input.requirements || undefined,
    price: input.price,
    durationMinutes: input.durationMinutes,
    bufferMinutes: input.bufferMinutes,
    featured: input.featured,
    active: input.active,
  }
}

const mockMerchantServicesService: MerchantServicesService = {
  async getServiceMenu(businessId) {
    await delay(350)
    requireMember(businessId)
    const db = readMockDb()
    const slug = db.businesses.find((business) => business.id === businessId)?.slug ?? ''
    return { services: menuOf(db, businessId), categories: categoriesFor(db, businessId), shopSlug: slug }
  },

  async createService(businessId, input) {
    await delay(500)
    requireMember(businessId)
    return updateMockDb((db) => {
      const valid = checkInput(db, businessId, input)
      const last = menuOf(db, businessId).at(-1)
      const service: Service = {
        id: createMockId('svc'),
        businessId,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        ...fromInput(valid),
      }
      db.services.push(service)
      return structuredClone(service)
    })
  },

  async updateService(businessId, serviceId, input) {
    await delay(500)
    requireMember(businessId)
    return updateMockDb((db) => {
      const service = findService(db, businessId, serviceId)
      const valid = checkInput(db, businessId, input, serviceId)
      Object.assign(service, fromInput(valid))
      // `fromInput` leaves cleared text as undefined; drop the keys so they don't linger as nulls in storage.
      if (!service.description) delete service.description
      if (!service.requirements) delete service.requirements
      return structuredClone(service)
    })
  },

  async moveService(businessId, serviceId, direction) {
    await delay(250)
    requireMember(businessId)
    return updateMockDb((db) => {
      const service = findService(db, businessId, serviceId)
      const siblings = menuOf(db, businessId).filter((candidate) => candidate.categoryId === service.categoryId)
      const index = siblings.indexOf(service)
      const neighbour = siblings[direction === 'up' ? index - 1 : index + 1]
      if (neighbour) [service.sortOrder, neighbour.sortOrder] = [neighbour.sortOrder, service.sortOrder]
      return structuredClone(menuOf(db, businessId))
    })
  },

  async deleteService(businessId, serviceId) {
    await delay(400)
    requireMember(businessId)
    updateMockDb((db) => {
      findService(db, businessId, serviceId)
      if (db.bookings.some((booking) => booking.serviceId === serviceId)) {
        throw new ApiError('Customers have booked this service, so it can’t be deleted. Hide it instead.', 409)
      }
      db.services = db.services.filter((service) => service.id !== serviceId)
      db.staff.forEach((member) => {
        member.serviceIds = member.serviceIds.filter((id) => id !== serviceId)
      })
    })
  },
}

export const merchantServicesService: MerchantServicesService = env.useMocks
  ? mockMerchantServicesService
  : httpMerchantServicesService
