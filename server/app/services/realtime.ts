import transmit from '@adonisjs/transmit/services/main'
import type { ID } from '#shared/domain'

/**
 * Live updates over Server-Sent Events (AdonisJS Transmit). Each signed-in user
 * listens on their own channel, and merchants also on their business's. Events
 * only say *what* changed; the SPA then refetches it through the normal API, so
 * every read still goes through the same authorization.
 *
 * Keep in sync with src/features/realtime/realtime-events.ts.
 */
export type RealtimeEvent =
  { type: 'booking.changed'; bookingId: ID } | { type: 'conversation.changed'; conversationId: ID }

export const channels = {
  user: (userId: ID) => `users/${userId}`,
  business: (businessId: ID) => `businesses/${businessId}`,
}

function broadcast(channel: string, event: RealtimeEvent) {
  transmit.broadcast(channel, event)
}

/** Tells the customer and the shop that a booking changed. */
export function bookingChanged(booking: { id: ID; customerId: ID; businessId: ID }) {
  const event: RealtimeEvent = { type: 'booking.changed', bookingId: booking.id }
  broadcast(channels.user(booking.customerId), event)
  broadcast(channels.business(booking.businessId), event)
}

/** Tells both sides of a conversation that it changed (new message, read receipt, report). */
export function conversationChanged(conversation: { id: ID; customerId: ID; businessId: ID }) {
  const event: RealtimeEvent = { type: 'conversation.changed', conversationId: conversation.id }
  broadcast(channels.user(conversation.customerId), event)
  broadcast(channels.business(conversation.businessId), event)
}
