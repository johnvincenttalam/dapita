/** Which emails a shop owner or staff member gets about their business (§9.2 Settings). */
export interface MerchantNotificationSettings {
  /** A customer sends a booking request. */
  newRequest: boolean
  /** A request is about to expire unanswered. */
  requestExpiring: boolean
  /** A customer sends a message. */
  newMessage: boolean
  /** Each morning: today's appointments and what's waiting. */
  dailySummary: boolean
}
