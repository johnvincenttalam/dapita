import type { CaseStatus, ModerationActionType } from '@/types/admin'
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
