import type { QueryClient } from '@tanstack/react-query'

import { bookingKeys } from '@/features/booking/api/queries'
import { conversationKeys } from '@/features/messaging/api/queries'
import type { SessionUser } from '@/types/auth'
import type { ID } from '@/types/common'

/**
 * What the server pushes over Server-Sent Events (server/app/services/realtime.ts).
 * Events only name what changed; the screens refetch it through the normal API.
 */
export type RealtimeEvent =
  { type: 'booking.changed'; bookingId: ID } | { type: 'conversation.changed'; conversationId: ID }

/** The user's own channel, plus one per business they manage. The server checks access to each. */
export function channelsFor(user: SessionUser): string[] {
  return [`users/${user.id}`, ...user.memberships.map((membership) => `businesses/${membership.businessId}`)]
}

/** Refetches whatever the event touches, for the customer's and the merchant's screens alike. */
export function applyRealtimeEvent(queryClient: QueryClient, event: RealtimeEvent) {
  switch (event.type) {
    case 'booking.changed':
      // Conversation summaries show the booking's status too.
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all })
      break
    case 'conversation.changed':
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all })
      break
  }
}

/** After a dropped connection, events may have been missed: refresh everything they cover. */
export function refreshAfterReconnect(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
  void queryClient.invalidateQueries({ queryKey: conversationKeys.all })
}
