import { ApiError, apiClient } from '@/lib/api-client'
import { env } from '@/lib/env'
import { maxOpenSupportRequests, supportRequestSchema, type SupportRequestInput } from '@/schemas/support'
import { updateMockDb } from '@/services/mock/db'
import { getMockSessionUser } from '@/services/mock/users'
import { createMockId, delay } from '@/services/mock/utils'
import type { ID, ISODateTime } from '@/types/common'

/** What the sender gets back: the case number to quote if they write again. */
export interface SupportRequestReceipt {
  id: ID
  createdAt: ISODateTime
}

/** Requests to Dapita support from the support page (ADM-03). Each one opens a case. */
export interface SupportService {
  sendRequest: (input: SupportRequestInput) => Promise<SupportRequestReceipt>
}

// Endpoint from docs/implementation-plan.md §7.3 (Support).
const httpSupportService: SupportService = {
  sendRequest: (input) => apiClient.post<SupportRequestReceipt>('/support/requests', input),
}

// MOCK: opens a case in this browser's mock database. Nobody is emailed.
const mockSupportService: SupportService = {
  async sendRequest(input) {
    await delay(600)
    const user = getMockSessionUser()
    if (!user) throw new ApiError('Sign in to contact support.', 401)
    const parsed = supportRequestSchema.safeParse(input)
    if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message ?? 'Check the details.', 422)
    const { topic, message } = parsed.data
    const bookingId = topic === 'booking' ? parsed.data.bookingId || undefined : undefined
    const businessId = topic === 'listing' ? parsed.data.businessId : undefined

    return updateMockDb((db) => {
      const waiting = db.supportCases.filter(
        (item) => item.kind !== 'message' && item.reporterId === user.id && item.status !== 'resolved',
      )
      if (waiting.length >= maxOpenSupportRequests) {
        throw new ApiError(
          `You have ${maxOpenSupportRequests} requests waiting. We’ll answer those first; add anything new to them by email.`,
          429,
        )
      }
      const isMember = (id: ID) => user.memberships.some((membership) => membership.businessId === id)
      let side: 'customer' | 'business' = 'customer'
      let caseBusinessId = businessId
      if (bookingId) {
        const booking = db.bookings.find((candidate) => candidate.id === bookingId)
        if (!booking || (booking.customerId !== user.id && !isMember(booking.businessId))) {
          throw new ApiError('We couldn’t find that booking.', 404)
        }
        side = booking.customerId === user.id ? 'customer' : 'business'
        caseBusinessId = booking.businessId
      } else if (businessId) {
        const business = db.businesses.find((candidate) => candidate.id === businessId)
        if (business?.status !== 'approved') throw new ApiError('We couldn’t find that shop.', 404)
      } else if (user.memberships.length) {
        side = 'business'
      }

      const now = new Date().toISOString()
      const id = createMockId('case')
      db.supportCases.push({
        id,
        kind: topic,
        ...(caseBusinessId ? { businessId: caseBusinessId } : {}),
        ...(bookingId ? { bookingId } : {}),
        reporterId: user.id,
        reporterSide: side,
        status: 'open',
        createdAt: now,
        updatedAt: now,
        events: [{ id: createMockId('cev'), kind: 'opened', actorName: user.name, text: message, at: now }],
      })
      return { id, createdAt: now }
    })
  },
}

export const supportService: SupportService = env.useMocks ? mockSupportService : httpSupportService
