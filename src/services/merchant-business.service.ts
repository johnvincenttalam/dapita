import { toDateKey } from '@/lib/datetime'
import { ApiError, apiClient } from '@/lib/api-client'
import { listingChecklist } from '@/lib/listing-checklist'
import { env } from '@/lib/env'
import {
  businessProfileSchema,
  closureSchema,
  policiesSchema,
  weeklyHoursSchema,
  type BusinessProfileInput,
  type ClosureInput,
  type PoliciesInput,
} from '@/schemas/business'
import { readMockDb, updateMockDb, type MockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { createMockId, delay } from '@/services/mock/utils'
import type { Business, WeeklyHours } from '@/types/business'
import type { Area, ServiceCategory } from '@/types/catalog'
import type { ID } from '@/types/common'
import type { z } from 'zod'

/** The owner's listing, with what the profile form offers to choose from. */
export interface BusinessProfile {
  business: Business
  areas: Area[]
  /** Top-level categories a listing can be filed under. */
  categories: ServiceCategory[]
}

export interface MerchantBusinessService {
  getBusiness: (businessId: ID) => Promise<BusinessProfile>
  updateProfile: (businessId: ID, input: BusinessProfileInput) => Promise<Business>
  updateHours: (businessId: ID, hours: WeeklyHours) => Promise<Business>
  addClosure: (businessId: ID, input: ClosureInput) => Promise<Business>
  deleteClosure: (businessId: ID, closureId: ID) => Promise<Business>
  /** A change to the wording starts a new policy version; bookings keep the version agreed. */
  updatePolicies: (businessId: ID, input: PoliciesInput) => Promise<Business>
  /** Sends a finished draft (or one with requested changes) to admin review. It stays private until approved. */
  submitForReview: (businessId: ID) => Promise<Business>
}

// Endpoints from docs/implementation-plan.md §7.3.
const businessPath = (businessId: ID) => `/merchant/businesses/${encodeURIComponent(businessId)}`

const httpMerchantBusinessService: MerchantBusinessService = {
  getBusiness: (businessId) => apiClient.get<BusinessProfile>(businessPath(businessId)),
  updateProfile: (businessId, input) => apiClient.put<Business>(businessPath(businessId), input),
  updateHours: (businessId, hours) => apiClient.put<Business>(`${businessPath(businessId)}/hours`, hours),
  addClosure: (businessId, input) => apiClient.post<Business>(`${businessPath(businessId)}/closures`, input),
  deleteClosure: (businessId, closureId) =>
    apiClient.delete<Business>(`${businessPath(businessId)}/closures/${encodeURIComponent(closureId)}`),
  updatePolicies: (businessId, input) => apiClient.put<Business>(`${businessPath(businessId)}/policies`, input),
  submitForReview: (businessId) => apiClient.post<Business>(`${businessPath(businessId)}/submit`),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Validates with the same schemas as the forms. The slug never changes, so
// shared links and bookmarks keep working after a rename.

function requireMember(businessId: ID) {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  if (!user.memberships.some((membership) => membership.businessId === businessId)) {
    throw new ApiError('You don’t have access to this business.', 403)
  }
}

function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input)
  if (!result.success) throw new ApiError(result.error.issues[0]?.message ?? 'Check the details.', 422)
  return result.data
}

function findBusiness(db: MockDb, businessId: ID) {
  const business = db.businesses.find((candidate) => candidate.id === businessId)
  if (!business) throw new ApiError('We couldn’t find that business.', 404)
  return business
}

function change(businessId: ID, apply: (business: Business, db: MockDb) => void): Business {
  return updateMockDb((db) => {
    const business = findBusiness(db, businessId)
    apply(business, db)
    business.updatedAt = new Date().toISOString()
    return structuredClone(business)
  })
}

const listingCategories = (db: MockDb) =>
  db.categories
    .filter((category) => !category.parentId && category.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder)

const mockMerchantBusinessService: MerchantBusinessService = {
  async getBusiness(businessId) {
    await delay(350)
    requireMember(businessId)
    const db = readMockDb()
    return { business: findBusiness(db, businessId), areas: db.areas, categories: listingCategories(db) }
  },

  async updateProfile(businessId, input) {
    await delay(500)
    requireMember(businessId)
    const valid = validate(businessProfileSchema, input)
    return change(businessId, (business, db) => {
      if (!db.areas.some((area) => area.id === valid.areaId)) throw new ApiError('Choose an area from the list.', 422)
      const allowed = new Set(listingCategories(db).map((category) => category.id))
      if (!valid.categoryIds.every((id) => allowed.has(id))) throw new ApiError('Choose categories from the list.', 422)
      Object.assign(business, {
        name: valid.name,
        description: valid.description,
        categoryIds: valid.categoryIds,
        areaId: valid.areaId,
        address: valid.address,
      })
      if (valid.phone) business.phone = valid.phone
      else delete business.phone
    })
  },

  async updateHours(businessId, hours) {
    await delay(450)
    requireMember(businessId)
    const valid = validate(weeklyHoursSchema, hours)
    return change(businessId, (business) => {
      business.hours = valid
    })
  },

  async addClosure(businessId, input) {
    await delay(400)
    requireMember(businessId)
    const valid = validate(closureSchema, input)
    if (valid.endDate < toDateKey(new Date())) {
      throw new ApiError('That closure has already passed. Choose today or a later date.', 422)
    }
    return change(businessId, (business) => {
      business.closures.push({
        id: createMockId('cl'),
        startDate: valid.startDate,
        endDate: valid.endDate,
        ...(valid.reason ? { reason: valid.reason } : {}),
      })
      business.closures.sort((a, b) => a.startDate.localeCompare(b.startDate))
    })
  },

  async deleteClosure(businessId, closureId) {
    await delay(300)
    requireMember(businessId)
    return change(businessId, (business) => {
      if (!business.closures.some((closure) => closure.id === closureId)) {
        throw new ApiError('We couldn’t find that closure.', 404)
      }
      business.closures = business.closures.filter((closure) => closure.id !== closureId)
    })
  },

  async updatePolicies(businessId, input) {
    await delay(450)
    requireMember(businessId)
    const valid = validate(policiesSchema, input)
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
  },

  async submitForReview(businessId) {
    await delay(600)
    requireMember(businessId)
    return change(businessId, (business, db) => {
      if (business.status === 'pending_review') throw new ApiError('Your listing is already waiting for review.', 409)
      if (business.status !== 'draft' && business.status !== 'changes_requested') {
        throw new ApiError(
          business.status === 'approved' ? 'Your listing is already live.' : 'This listing can’t be submitted.',
          409,
        )
      }
      const services = db.services.filter((service) => service.businessId === businessId)
      const { items, ready } = listingChecklist(business, services)
      if (!ready) {
        const todo = items.filter((item) => !item.done).map((item) => item.label.toLowerCase())
        const list = todo.length > 1 ? `${todo.slice(0, -1).join(', ')} and ${todo.at(-1)}` : todo[0]
        throw new ApiError(`Finish these first: ${list}.`, 422)
      }
      business.status = 'pending_review'
    })
  },
}

export const merchantBusinessService: MerchantBusinessService = env.useMocks
  ? mockMerchantBusinessService
  : httpMerchantBusinessService
