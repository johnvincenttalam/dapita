import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useSession } from '@/features/auth/api/queries'
import { createRealtimeClient } from '@/features/realtime/realtime-client'
import {
  applyRealtimeEvent,
  channelsFor,
  refreshAfterReconnect,
  type RealtimeEvent,
} from '@/features/realtime/realtime-events'
import { env } from '@/lib/env'

/**
 * Keeps every open screen in step with the server: when a booking or conversation
 * changes on another device, the server pushes an event and the affected queries
 * refetch. Mock mode has no server, so it relies on polling and window focus.
 */
export function useRealtimeSync({ enabled = !env.useMocks } = {}) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  // A string, so a re-render with the same user doesn't reconnect.
  const channelKey = enabled && user ? channelsFor(user).join(' ') : ''

  useEffect(() => {
    if (!channelKey) return
    let client: ReturnType<typeof createRealtimeClient>
    try {
      client = createRealtimeClient()
    } catch {
      // Live updates are an extra: without them, screens still refresh by polling and on focus.
      return
    }
    const subscriptions = channelKey.split(' ').map((channel) => client.subscription(channel))
    const stopListening = subscriptions.map((subscription) =>
      subscription.onMessage<RealtimeEvent>((event) => applyRealtimeEvent(queryClient, event)),
    )
    for (const subscription of subscriptions) {
      // A refused or failed subscription leaves that screen on polling; nothing to show the user.
      subscription.create().catch(() => undefined)
    }

    let connectedBefore = false
    const onConnected = () => {
      if (connectedBefore) refreshAfterReconnect(queryClient)
      connectedBefore = true
    }
    client.on('connected', onConnected)

    return () => {
      for (const stop of stopListening) stop()
      client.off('connected', onConnected)
      client.close()
    }
  }, [channelKey, queryClient])
}

/** Mount once inside the router; renders nothing. */
export function RealtimeSync() {
  useRealtimeSync()
  return null
}
