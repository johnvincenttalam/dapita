import type { CaseKind, CaseListItem, CaseStatus, ModerationActionType } from '@/types/admin'
import type { BusinessStatus } from '@/types/business'

/** Which decisions apply to a listing in each state, and where each one leads (ADM-01). */
export const moderationRules: Record<ModerationActionType, { from: BusinessStatus[]; to: BusinessStatus }> = {
  approve: { from: ['pending_review'], to: 'approved' },
  request_changes: { from: ['pending_review'], to: 'changes_requested' },
  reject: { from: ['pending_review', 'changes_requested'], to: 'rejected' },
  suspend: { from: ['approved'], to: 'suspended' },
  reinstate: { from: ['suspended'], to: 'approved' },
}

const order: ModerationActionType[] = ['approve', 'request_changes', 'reject', 'suspend', 'reinstate']

export function availableModerationActions(status: BusinessStatus): ModerationActionType[] {
  return order.filter((action) => moderationRules[action].from.includes(status))
}

export const moderationLabels: Record<ModerationActionType, { verb: string; done: string }> = {
  approve: { verb: 'Approve', done: 'Approved' },
  request_changes: { verb: 'Request changes', done: 'Asked for changes' },
  reject: { verb: 'Reject', done: 'Rejected' },
  suspend: { verb: 'Suspend', done: 'Suspended' },
  reinstate: { verb: 'Reinstate', done: 'Reinstated' },
}

export const businessStatusLabels: Record<BusinessStatus, string> = {
  draft: 'Draft',
  pending_review: 'Waiting for review',
  changes_requested: 'Changes requested',
  approved: 'Live',
  suspended: 'Suspended',
  rejected: 'Rejected',
}

export const caseStatusLabels: Record<CaseStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

export const caseKindLabels: Record<CaseKind, string> = {
  message: 'Reported conversation',
  booking: 'Booking',
  listing: 'Listing report',
  account: 'Account or data',
  other: 'Other request',
}

/** The headline for a case in lists and on its page: who or what it's about. */
export function caseTitle(item: Pick<CaseListItem, 'kind' | 'customerName' | 'businessName' | 'reporterName'>) {
  switch (item.kind) {
    case 'message':
      return `${item.customerName ?? 'A customer'} and ${item.businessName ?? 'a shop'}`
    case 'booking':
      return item.businessName ? `Booking at ${item.businessName}` : `Booking help for ${item.reporterName}`
    case 'listing':
      return `${item.businessName ?? 'A shop'}’s listing`
    case 'account':
      return `${item.reporterName}’s account`
    case 'other':
      return `Request from ${item.reporterName}`
  }
}
