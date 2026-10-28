import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { availableModerationActions, businessStatusLabels, moderationLabels, moderationRules } from '@/lib/moderation'
import { hasAnyRole } from '@/lib/roles'
import { moderationSchema, type ModerationInput } from '@/schemas/moderation'
import { readMockDb, updateMockDb, type MockDb } from '@/services/mock/db'
import { readMockAccounts, updateMockAccounts } from '@/services/mock/accounts'
import { slugify } from '@/services/mock/draft-business'
import { getMockSessionUser, listMockUsers, mockAccountDefaults } from '@/services/mock/users'
import { createMockId, delay } from '@/services/mock/utils'
import type { SessionUser, UserRole } from '@/types/auth'
import type {
  AdminCategory,
  AdminUser,
  CaseDetails,
  CaseEvent,
  CaseListItem,
  MerchantListItem,
  MerchantReview,
  SupportCase,
} from '@/types/admin'
import type { Business } from '@/types/business'
import type { CategoryStatus } from '@/types/catalog'
import type { ID } from '@/types/common'

export interface AdminService {
  listMerchants: () => Promise<MerchantListItem[]>
  getMerchantReview: (businessId: ID) => Promise<MerchantReview>
  moderateMerchant: (businessId: ID, input: ModerationInput) => Promise<MerchantReview>
  listCases: () => Promise<CaseListItem[]>
  getCase: (caseId: ID) => Promise<CaseDetails>
  /** Assigns the case to the signed-in admin and marks it in progress. */
  takeCase: (caseId: ID) => Promise<CaseDetails>
  addCaseNote: (caseId: ID, text: string) => Promise<CaseDetails>
  resolveCase: (caseId: ID, resolution: string) => Promise<CaseDetails>
  // Taxonomy and featured listings (ADM-02)
  listCategories: () => Promise<AdminCategory[]>
  updateCategory: (id: ID, input: CategoryInput) => Promise<AdminCategory[]>
  moveCategory: (id: ID, direction: 'up' | 'down') => Promise<AdminCategory[]>
  addSubcategory: (parentId: ID, name: string) => Promise<AdminCategory[]>
  /** Only live listings can be featured. */
  setFeatured: (businessId: ID, featured: boolean) => Promise<MerchantListItem>
  // Accounts
  listUsers: (query?: string) => Promise<AdminUser[]>
  suspendUser: (userId: ID, reason: string) => Promise<AdminUser>
  reinstateUser: (userId: ID, reason: string) => Promise<AdminUser>
}

export interface CategoryInput {
  name: string
  status: CategoryStatus
}

const merchantPath = (id: ID) => `/admin/merchants/${encodeURIComponent(id)}`
const casePath = (id: ID) => `/admin/cases/${encodeURIComponent(id)}`

// Endpoints follow docs/implementation-plan.md §7.3 (admin).
const httpAdminService: AdminService = {
  listMerchants: () => apiClient.get<MerchantListItem[]>('/admin/merchants'),
  getMerchantReview: (id) => apiClient.get<MerchantReview>(merchantPath(id)),
  moderateMerchant: (id, input) => apiClient.post<MerchantReview>(`${merchantPath(id)}/moderation`, input),
  listCases: () => apiClient.get<CaseListItem[]>('/admin/cases'),
  getCase: (id) => apiClient.get<CaseDetails>(casePath(id)),
  takeCase: (id) => apiClient.post<CaseDetails>(`${casePath(id)}/take`),
  addCaseNote: (id, text) => apiClient.post<CaseDetails>(`${casePath(id)}/notes`, { text }),
  resolveCase: (id, resolution) => apiClient.post<CaseDetails>(`${casePath(id)}/resolve`, { resolution }),
  listCategories: () => apiClient.get<AdminCategory[]>('/admin/categories'),
  updateCategory: (id, input) => apiClient.put<AdminCategory[]>(`/admin/categories/${encodeURIComponent(id)}`, input),
  moveCategory: (id, direction) =>
    apiClient.post<AdminCategory[]>(`/admin/categories/${encodeURIComponent(id)}/move`, { direction }),
  addSubcategory: (parentId, name) => apiClient.post<AdminCategory[]>('/admin/categories', { parentId, name }),
  setFeatured: (id, featured) => apiClient.put<MerchantListItem>(`${merchantPath(id)}/featured`, { featured }),
  listUsers: (query) => apiClient.get<AdminUser[]>('/admin/users', { query: { q: query } }),
  suspendUser: (id, reason) => apiClient.post<AdminUser>(`/admin/users/${encodeURIComponent(id)}/suspend`, { reason }),
  reinstateUser: (id, reason) =>
    apiClient.post<AdminUser>(`/admin/users/${encodeURIComponent(id)}/reinstate`, { reason }),
}

// ─── MOCK ────────────────────────────────────────────────────────────────────
// Moderation is for administrators; support staff can work cases too. Every
// decision and case step is written to an audit trail with who and when.

function requireStaff(roles: readonly UserRole[]): SessionUser {
  const user = getMockSessionUser()
  if (!user) throw new ApiError('Sign in to continue.', 401)
  if (!hasAnyRole(user, roles)) throw new ApiError('This is for Dapita staff only.', 403)
  return user
}

const nameOf = (db: MockDb, ids: ID[]) =>
  ids
    .map((id) => db.categories.find((category) => category.id === id)?.name)
    .filter((name): name is string => Boolean(name))

function ownerOf(business: Business) {
  const user = listMockUsers().find((candidate) => candidate.id === business.ownerId)
  return { id: business.ownerId, name: user?.name ?? 'Owner not on record', email: user?.email }
}

function findBusiness(db: MockDb, id: ID) {
  const business = db.businesses.find((candidate) => candidate.id === id)
  if (!business) throw new ApiError('We couldn’t find that listing.', 404)
  return business
}

function toListItem(db: MockDb, business: Business): MerchantListItem {
  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    status: business.status,
    areaName: db.areas.find((area) => area.id === business.areaId)?.name ?? '',
    categoryNames: nameOf(db, business.categoryIds),
    ownerName: ownerOf(business).name,
    serviceCount: db.services.filter((service) => service.businessId === business.id).length,
    featured: business.featured,
    updatedAt: business.updatedAt,
  }
}

function toCategories(db: MockDb): AdminCategory[] {
  return db.categories
    .map((category) => ({
      ...category,
      shopCount: db.businesses.filter((business) => business.categoryIds.includes(category.id)).length,
      serviceCount: db.services.filter((service) => service.categoryId === category.id).length,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function categoryName(name: string) {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  if (trimmed.length < 2) throw new ApiError('Give the category a name of at least 2 characters.', 422)
  if (trimmed.length > 40) throw new ApiError('Keep the name to 40 characters or fewer.', 422)
  return trimmed
}

const sameName = (a: string, b: string) =>
  a.replace(/[’']/g, "'").toLowerCase() === b.replace(/[’']/g, "'").toLowerCase()

function toAdminUser(user: SessionUser): AdminUser {
  const state = readMockAccounts().state[user.id]
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    businessNames: user.memberships.map((membership) => membership.businessName),
    emailVerified: user.emailVerified,
    createdAt: mockAccountDefaults(user.id).createdAt,
    suspended: Boolean(state?.suspendedAt),
    suspendedReason: state?.suspendedReason,
    history: [...(state?.accountActions ?? [])].reverse(),
  }
}

function accountAction(userId: ID, reason: string, action: 'suspend' | 'reinstate') {
  const admin = requireStaff(['admin'])
  const text = requireText(reason, 'a reason')
  const user = listMockUsers().find((candidate) => candidate.id === userId)
  if (!user) throw new ApiError('We couldn’t find that account.', 404)
  if (action === 'suspend') {
    if (user.id === admin.id) throw new ApiError('You can’t suspend your own account.', 409)
    if (hasAnyRole(user, ['admin'])) throw new ApiError('Administrator accounts can’t be suspended here.', 403)
  }
  const now = new Date().toISOString()
  updateMockAccounts((store) => {
    const state = (store.state[userId] ??= {})
    const suspended = Boolean(state.suspendedAt)
    if (action === 'suspend' && suspended) throw new ApiError('This account is already suspended.', 409)
    if (action === 'reinstate' && !suspended) throw new ApiError('This account isn’t suspended.', 409)
    if (action === 'suspend') {
      state.suspendedAt = now
      state.suspendedReason = text
    } else {
      delete state.suspendedAt
      delete state.suspendedReason
    }
    state.accountActions = [...(state.accountActions ?? []), { action, reason: text, actorName: admin.name, at: now }]
  })
  return toAdminUser(user)
}

function toReview(db: MockDb, business: Business): MerchantReview {
  return {
    business: structuredClone(business),
    areaName: db.areas.find((area) => area.id === business.areaId)?.name ?? '',
    categoryNames: nameOf(db, business.categoryIds),
    services: db.services
      .filter((service) => service.businessId === business.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    owner: ownerOf(business),
    history: db.moderationActions
      .filter((action) => action.businessId === business.id)
      .sort((a, b) => b.at.localeCompare(a.at)),
    availableActions: availableModerationActions(business.status),
  }
}

function findCase(db: MockDb, id: ID) {
  const found = db.supportCases.find((candidate) => candidate.id === id)
  if (!found) throw new ApiError('We couldn’t find that case.', 404)
  return found
}

/** The latest report or request on the case: what was said, and by whom. */
const latestReport = (item: SupportCase) =>
  item.events.findLast((event) => event.kind === 'opened' || event.kind === 'reported_again')

function toCaseItem(db: MockDb, item: SupportCase): CaseListItem {
  const conversation = item.conversationId
    ? db.conversations.find((candidate) => candidate.id === item.conversationId)
    : undefined
  const report = db.conversationReports
    .filter((candidate) => item.conversationId && candidate.conversationId === item.conversationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const businessId = conversation?.businessId ?? item.businessId
  const latest = latestReport(item)
  return {
    id: item.id,
    kind: item.kind,
    status: item.status,
    ownerName: item.ownerName,
    reason: report?.reason ?? latest?.text ?? '',
    reporterName: latest?.actorName ?? '',
    reporterSide: report?.reporterSide ?? item.reporterSide,
    ...(item.conversationId ? { conversationId: item.conversationId } : {}),
    ...(conversation ? { customerName: conversation.customerName } : {}),
    ...(businessId
      ? { businessId, businessName: db.businesses.find((business) => business.id === businessId)?.name }
      : {}),
    ...(item.bookingId ? { bookingId: item.bookingId } : {}),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function toCaseDetails(db: MockDb, item: SupportCase): CaseDetails {
  const booking = item.bookingId ? db.bookings.find((candidate) => candidate.id === item.bookingId) : undefined
  const reporter = listMockUsers().find((user) => user.id === item.reporterId)
  return {
    ...toCaseItem(db, item),
    ...(reporter ? { reporterEmail: reporter.email } : {}),
    events: structuredClone(item.events),
    messages: db.messages
      .filter((message) => item.conversationId && message.conversationId === item.conversationId)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    ...(booking
      ? {
          booking: {
            reference: booking.reference,
            serviceName: booking.service.name,
            start: booking.start,
            status: booking.status,
          },
        }
      : {}),
  }
}

/** Open cases first, then in progress, then resolved; newest first within each. */
const caseOrder = { open: 0, in_progress: 1, resolved: 2 } as const

function caseStep(id: ID, apply: (item: SupportCase, user: SessionUser, event: Omit<CaseEvent, 'kind'>) => void) {
  const user = requireStaff(['admin', 'support'])
  return updateMockDb((db) => {
    const item = findCase(db, id)
    const now = new Date().toISOString()
    apply(item, user, { id: createMockId('cev'), actorName: user.name, at: now })
    item.updatedAt = now
    return toCaseDetails(db, item)
  })
}

function requireText(text: string, what: string) {
  const trimmed = text.trim()
  if (trimmed.length < 5) throw new ApiError(`Write ${what} of at least 5 characters.`, 422)
  if (trimmed.length > 1000) throw new ApiError(`Keep ${what} to 1,000 characters or fewer.`, 422)
  return trimmed
}

const mockAdminService: AdminService = {
  async listMerchants() {
    await delay(300)
    requireStaff(['admin'])
    const db = readMockDb()
    return db.businesses
      .map((business) => toListItem(db, business))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async getMerchantReview(businessId) {
    await delay(300)
    requireStaff(['admin'])
    const db = readMockDb()
    return toReview(db, findBusiness(db, businessId))
  },

  async moderateMerchant(businessId, input) {
    await delay(500)
    const user = requireStaff(['admin'])
    const parsed = moderationSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? 'Give a reason.', 422)
    const { action, reason } = parsed.data
    return updateMockDb((db) => {
      const business = findBusiness(db, businessId)
      const rule = moderationRules[action]
      if (!rule.from.includes(business.status)) {
        const state = business.status === 'approved' ? 'live' : businessStatusLabels[business.status].toLowerCase()
        throw new ApiError(
          `This listing can’t be ${moderationLabels[action].done.toLowerCase()} while it’s ${state}.`,
          409,
        )
      }
      const now = new Date().toISOString()
      db.moderationActions.push({
        id: createMockId('mod'),
        businessId,
        action,
        from: business.status,
        to: rule.to,
        reason,
        actorId: user.id,
        actorName: user.name,
        at: now,
      })
      business.status = rule.to
      business.updatedAt = now
      // The owner sees why it was sent back, rejected or suspended; a listing that goes live has nothing to fix.
      if (rule.to === 'approved') delete business.moderationNote
      else business.moderationNote = reason
      return toReview(db, business)
    })
  },

  async listCases() {
    await delay(300)
    requireStaff(['admin', 'support'])
    const db = readMockDb()
    return db.supportCases
      .map((item) => toCaseItem(db, item))
      .sort((a, b) => caseOrder[a.status] - caseOrder[b.status] || b.createdAt.localeCompare(a.createdAt))
  },

  async getCase(caseId) {
    await delay(250)
    requireStaff(['admin', 'support'])
    const db = readMockDb()
    return toCaseDetails(db, findCase(db, caseId))
  },

  async takeCase(caseId) {
    await delay(300)
    return caseStep(caseId, (item, user, event) => {
      if (item.status === 'resolved') throw new ApiError('This case is already resolved.', 409)
      item.ownerId = user.id
      item.ownerName = user.name
      item.status = 'in_progress'
      item.events.push({ ...event, kind: 'taken' })
    })
  },

  async addCaseNote(caseId, text) {
    await delay(300)
    const note = requireText(text, 'a note')
    return caseStep(caseId, (item, _user, event) => {
      item.events.push({ ...event, kind: 'note', text: note })
    })
  },

  async resolveCase(caseId, resolution) {
    await delay(400)
    const text = requireText(resolution, 'what was done')
    return caseStep(caseId, (item, user, event) => {
      if (item.status === 'resolved') throw new ApiError('This case is already resolved.', 409)
      item.ownerId ??= user.id
      item.ownerName ??= user.name
      item.status = 'resolved'
      item.events.push({ ...event, kind: 'resolved', text })
    })
  },

  async listCategories() {
    await delay(250)
    requireStaff(['admin'])
    return toCategories(readMockDb())
  },

  async updateCategory(id, input) {
    await delay(350)
    requireStaff(['admin'])
    const name = categoryName(input.name)
    if (!['active', 'hidden', 'coming_soon'].includes(input.status)) throw new ApiError('Choose a status.', 422)
    return updateMockDb((db) => {
      const category = db.categories.find((candidate) => candidate.id === id)
      if (!category) throw new ApiError('We couldn’t find that category.', 404)
      const clash = db.categories.find(
        (other) => other.id !== id && other.parentId === category.parentId && sameName(other.name, name),
      )
      if (clash) throw new ApiError(`There’s already a category called “${clash.name}” here.`, 409)
      category.name = name
      category.status = input.status
      return toCategories(db)
    })
  },

  async moveCategory(id, direction) {
    await delay(200)
    requireStaff(['admin'])
    return updateMockDb((db) => {
      const category = db.categories.find((candidate) => candidate.id === id)
      if (!category) throw new ApiError('We couldn’t find that category.', 404)
      const siblings = db.categories
        .filter((other) => other.parentId === category.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const index = siblings.indexOf(category)
      const neighbour = siblings[direction === 'up' ? index - 1 : index + 1]
      if (neighbour) [category.sortOrder, neighbour.sortOrder] = [neighbour.sortOrder, category.sortOrder]
      return toCategories(db)
    })
  },

  async addSubcategory(parentId, rawName) {
    await delay(350)
    requireStaff(['admin'])
    const name = categoryName(rawName)
    return updateMockDb((db) => {
      const parent = db.categories.find((candidate) => candidate.id === parentId && !candidate.parentId)
      if (!parent) throw new ApiError('Choose a top-level category.', 422)
      const clash = db.categories.find((other) => other.parentId === parentId && sameName(other.name, name))
      if (clash) throw new ApiError(`${parent.name} already has “${clash.name}”.`, 409)
      let slug = slugify(name)
      for (let n = 2; db.categories.some((other) => other.slug === slug); n++) slug = `${slugify(name)}-${n}`
      db.categories.push({
        id: createMockId('sub'),
        slug,
        name,
        parentId,
        icon: parent.icon,
        status: 'active',
        sortOrder: Math.max(0, ...db.categories.map((other) => other.sortOrder)) + 1,
      })
      return toCategories(db)
    })
  },

  async setFeatured(businessId, featured) {
    await delay(300)
    requireStaff(['admin'])
    return updateMockDb((db) => {
      const business = findBusiness(db, businessId)
      if (featured && business.status !== 'approved') throw new ApiError('Only live listings can be featured.', 422)
      business.featured = featured
      return toListItem(db, business)
    })
  },

  async listUsers(query) {
    await delay(250)
    requireStaff(['admin', 'support'])
    const needle = query?.trim().toLowerCase()
    return listMockUsers()
      .filter((user) => !needle || user.name.toLowerCase().includes(needle) || user.email.includes(needle))
      .map(toAdminUser)
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  async suspendUser(userId, reason) {
    await delay(400)
    return accountAction(userId, reason, 'suspend')
  },

  async reinstateUser(userId, reason) {
    await delay(400)
    return accountAction(userId, reason, 'reinstate')
  },
}

export const adminService: AdminService = env.useMocks ? mockAdminService : httpAdminService
