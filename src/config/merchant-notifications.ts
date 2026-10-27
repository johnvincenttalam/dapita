import type { MerchantNotificationSettings } from '@/types/settings'

/** Requests and messages need a timely answer, so those emails start on; the summary is opt-in. */
export const defaultNotificationSettings: MerchantNotificationSettings = {
  newRequest: true,
  requestExpiring: true,
  newMessage: true,
  dailySummary: false,
}
