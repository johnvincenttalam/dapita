import db from '@adonisjs/lucid/services/db'
import Booking from '#models/booking'
import Business from '#models/business'
import Conversation from '#models/conversation'
import ConversationReport from '#models/conversation_report'
import Message from '#models/message'
import SupportCase from '#models/support_case'
import User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { requireText } from '#helpers/validate'
import { requireStaff } from '#services/accounts'
import { toMessageData } from '#services/conversations'
import type { CaseDetails, CaseEvent, CaseListItem, ID } from '#shared/domain'

/**
 * Support cases (ADM-03), ported from the mock in src/services/admin.service.ts.
 * A case comes from a reported conversation (src/services/conversations.ts) or a
 * request sent from the support page (src/services/support.ts). Administrators and
 * support staff work them; each step joins the audit trail.
 */

const STAFF = ['admin', 'support'] as const

const caseNotFound = () => new ApiError('We couldn’t find that case.', 404)

/** Open cases first, then in progress, then resolved; newest first within each. */
const caseOrder = { open: 0, in_progress: 1, resolved: 2 } as const

/** The latest report or request on the case: what was said, and by whom. */
const latestReport = (item: SupportCase) =>
  item.events.findLast((event) => event.kind === 'opened' || event.kind === 'reported_again')

const unique = (ids: (ID | null)[]) => [...new Set(ids.filter((id): id is ID => Boolean(id)))]

async function toCaseItems(cases: SupportCase[]): Promise<CaseListItem[]> {
  if (!cases.length) return []
  const conversationIds = unique(cases.map((item) => item.conversationId))
  const [conversations, reports] = conversationIds.length
    ? await Promise.all([
        Conversation.query().whereIn('id', conversationIds),
        ConversationReport.query()
          .whereIn('conversationId', conversationIds)
          .orderBy('createdAt', 'desc'),
      ])
    : [[], []]
  const businessIds = unique([
    ...cases.map((item) => item.businessId),
    ...conversations.map((conversation) => conversation.businessId),
  ])
  const businesses = businessIds.length
    ? await Business.query().whereIn('id', businessIds).select('id', 'name')
    : []
  return cases.map((item) => {
    const conversation = conversations.find((candidate) => candidate.id === item.conversationId)
    const report = reports.find((candidate) => candidate.conversationId === item.conversationId)
    const businessId = conversation?.businessId ?? item.businessId
    const latest = latestReport(item)
    return {
      id: item.id,
      kind: item.kind,
      status: item.status,
      ownerName: item.ownerName ?? undefined,
      reason: report?.reason ?? latest?.text ?? '',
      reporterName: latest?.actorName ?? '',
      reporterSide: report?.reporterSide ?? item.reporterSide ?? 'customer',
      conversationId: item.conversationId ?? undefined,
      customerName: conversation?.customerName,
      businessId: businessId ?? undefined,
      businessName: businesses.find((business) => business.id === businessId)?.name,
      bookingId: item.bookingId ?? undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  })
}

async function toCaseDetails(item: SupportCase): Promise<CaseDetails> {
  const [[summary], messages, booking, reporter] = await Promise.all([
    toCaseItems([item]),
    item.conversationId
      ? Message.query().where('conversationId', item.conversationId).orderBy('sentAt', 'asc')
      : [],
    item.bookingId ? Booking.find(item.bookingId) : null,
    item.reporterId ? User.find(item.reporterId) : null,
  ])
  return {
    ...summary,
    reporterEmail: reporter?.email,
    events: item.events,
    messages: messages.map(toMessageData),
    booking: booking
      ? {
          reference: booking.reference,
          serviceName: booking.service.name,
          start: booking.start,
          status: booking.status,
        }
      : undefined,
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
