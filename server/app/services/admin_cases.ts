import db from '@adonisjs/lucid/services/db'
import Business from '#models/business'
import Conversation from '#models/conversation'
import ConversationReport from '#models/conversation_report'
import Message from '#models/message'
import SupportCase from '#models/support_case'
import type User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { requireText } from '#helpers/validate'
import { requireStaff } from '#services/accounts'
import { toMessageData } from '#services/conversations'
import type { CaseDetails, CaseEvent, CaseListItem, ID } from '#shared/domain'

/**
 * Support cases (ADM-03), ported from the mock in src/services/admin.service.ts.
 * Every case comes from a reported conversation (src/services/conversations.ts opens
 * it). Administrators and support staff work them; each step joins the audit trail.
 */

const STAFF = ['admin', 'support'] as const

const caseNotFound = () => new ApiError('We couldn’t find that case.', 404)

/** Open cases first, then in progress, then resolved; newest first within each. */
const caseOrder = { open: 0, in_progress: 1, resolved: 2 } as const

async function toCaseItems(cases: SupportCase[]): Promise<CaseListItem[]> {
  if (!cases.length) return []
  const conversationIds = [...new Set(cases.map((item) => item.conversationId))]
  const [conversations, reports] = await Promise.all([
    Conversation.query().whereIn('id', conversationIds),
    ConversationReport.query()
      .whereIn('conversationId', conversationIds)
      .orderBy('createdAt', 'desc'),
  ])
  const businesses = await Business.query()
    .whereIn('id', [...new Set(conversations.map((conversation) => conversation.businessId))])
    .select('id', 'name')
  return cases.map((item) => {
    const conversation = conversations.find((candidate) => candidate.id === item.conversationId)
    const latest = reports.find((report) => report.conversationId === item.conversationId)
    return {
      id: item.id,
      conversationId: item.conversationId,
      status: item.status,
      ownerName: item.ownerName ?? undefined,
      reason: latest?.reason ?? '',
      reporterSide: latest?.reporterSide ?? 'customer',
      customerName: conversation?.customerName ?? '',
      businessName:
        businesses.find((business) => business.id === conversation?.businessId)?.name ?? '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  })
}

async function toCaseDetails(item: SupportCase): Promise<CaseDetails> {
  const [[summary], conversation, messages] = await Promise.all([
    toCaseItems([item]),
    Conversation.find(item.conversationId),
    Message.query().where('conversationId', item.conversationId).orderBy('sentAt', 'asc'),
  ])
  return {
    ...summary,
    businessId: conversation?.businessId ?? '',
    events: item.events,
    messages: messages.map(toMessageData),
  }
}

export async function listCases(staff: User) {
  requireStaff(staff, [...STAFF])
  const cases = await SupportCase.all()
  const items = await toCaseItems(cases)
  return items.sort(
    (a, b) => caseOrder[a.status] - caseOrder[b.status] || b.createdAt.localeCompare(a.createdAt)
  )
}

export async function getCase(staff: User, caseId: ID) {
  requireStaff(staff, [...STAFF])
  const item = await SupportCase.find(caseId)
  if (!item) throw caseNotFound()
  return toCaseDetails(item)
}

/** Locks the case, applies one step with a new audit event, and saves it. */
async function caseStep(
  staff: User,
  caseId: ID,
  apply: (item: SupportCase, event: Omit<CaseEvent, 'kind'>) => void
) {
  requireStaff(staff, [...STAFF])
  const item = await db.transaction(async (trx) => {
    const locked = await SupportCase.query({ client: trx }).where('id', caseId).forUpdate().first()
    if (!locked) throw caseNotFound()
    const now = new Date().toISOString()
    apply(locked, { id: newId('cev'), actorName: staff.name, at: now })
    locked.updatedAt = now
    await locked.save()
    return locked
  })
  return toCaseDetails(item)
}

/** Assigns the case to the signed-in staff member and marks it in progress. */
export function takeCase(staff: User, caseId: ID) {
  return caseStep(staff, caseId, (item, event) => {
    if (item.status === 'resolved') throw new ApiError('This case is already resolved.', 409)
    item.merge({ ownerId: staff.id, ownerName: staff.name, status: 'in_progress' })
    item.events = [...item.events, { ...event, kind: 'taken' }]
  })
}

export function addCaseNote(staff: User, caseId: ID, text: unknown) {
  const note = requireText(text, 'a note')
  return caseStep(staff, caseId, (item, event) => {
    item.events = [...item.events, { ...event, kind: 'note', text: note }]
  })
}

export function resolveCase(staff: User, caseId: ID, resolution: unknown) {
  const text = requireText(resolution, 'what was done')
  return caseStep(staff, caseId, (item, event) => {
    if (item.status === 'resolved') throw new ApiError('This case is already resolved.', 409)
    item.merge({
      ownerId: item.ownerId ?? staff.id,
      ownerName: item.ownerName ?? staff.name,
      status: 'resolved',
    })
    item.events = [...item.events, { ...event, kind: 'resolved', text }]
  })
}
