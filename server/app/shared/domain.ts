/**
 * The booking rules and domain types the frontend already uses (src/lib, src/config,
 * src/types), imported through the `@/` alias registered in bin/shared_alias.ts.
 * Running the same code on both sides means the browser's checks and the
 * server's decisions can't drift apart. The server stays the authority.
 *
 * Only pure modules belong here: nothing that touches the DOM, localStorage
 * or `import.meta.env`.
 */

export { bookingRules } from '@/config/booking'
export { legalDocuments } from '@/config/legal'
export { defaultNotificationSettings } from '@/config/merchant-notifications'
export {
  BookingTransitionError,
  computeRespondBy,
  isAwaitingResponse,
  proposalLeadMinutes,
  transition,
} from '@/lib/booking-status'
export { addMinutes, toDateKey } from '@/lib/datetime'
export { listingChecklist } from '@/lib/listing-checklist'
export { getOpenStatus, isPreferredStartTime } from '@/lib/opening-hours'
export { hasAnyRole } from '@/lib/roles'
export {
  businessProfileSchema,
  closureSchema,
  policiesSchema,
  weeklyHoursSchema,
} from '@/schemas/business'
export { serviceSchema } from '@/schemas/service'
export { slugify, starterHours } from '@/services/mock/draft-business'

export type * from '@/types/account'
export type * from '@/types/admin'
export type * from '@/types/auth'
export type * from '@/types/booking'
export type * from '@/types/business'
export type * from '@/types/catalog'
export type * from '@/types/common'
export type * from '@/types/message'
export type * from '@/types/settings'
