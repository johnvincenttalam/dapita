import { useState } from 'react'

import { useMerchantsQuery, useCasesQuery } from '@/features/admin/api/queries'
import { useSession } from '@/features/auth/api/queries'
import { useBusinessBookingsQuery } from '@/features/booking/api/merchant-queries'
import { useMyBookingsQuery } from '@/features/booking/api/queries'
import { useBusinessConversationsQuery, useMyConversationsQuery } from '@/features/messaging/api/queries'
import { buildNotifications, type AppNotification, type NotificationAudience } from '@/lib/notifications'
import { hasAnyRole } from '@/lib/roles'

// Which items this person marked read without opening them. A per-browser convenience:
// everything in the bell is rebuilt from live data, so losing this only re-shows a dot.
const storageKey = (userId: string) => `dapita-notifications-read:${userId}`

function readDismissed(userId: string | undefined): Set<string> {
  if (!userId) return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

/** What's waiting for the signed-in person, as bell notifications, plus a way to mark them read. */
export function useNotifications(audience: NotificationAudience) {
  const { user } = useSession()
  const businessId = audience === 'merchant' ? user?.memberships[0]?.businessId : undefined
  const isCustomer = audience === 'customer' && hasAnyRole(user, ['customer'])
  const isAdmin = audience === 'admin' && hasAnyRole(user, ['admin'])

  const myConversations = useMyConversationsQuery({ enabled: isCustomer })
  const myBookings = useMyBookingsQuery({ enabled: isCustomer })
  const businessConversations = useBusinessConversationsQuery(businessId)
  const businessBookings = useBusinessBookingsQuery(businessId)
  const merchants = useMerchantsQuery({ enabled: isAdmin })
  const cases = useCasesQuery({ enabled: isAdmin || (audience === 'admin' && hasAnyRole(user, ['support'])) })

  const [dismissed, setDismissed] = useState(() => readDismissed(user?.id))

  const notifications: AppNotification[] = buildNotifications(
    audience === 'customer'
      ? { audience, conversations: myConversations.data ?? [], bookings: myBookings.data ?? [] }
      : audience === 'merchant'
        ? { audience, conversations: businessConversations.data ?? [], bookings: businessBookings.data ?? [] }
        : { audience, merchants: merchants.data ?? [], cases: cases.data ?? [] },
    dismissed,
  )

  const markRead = (ids: string[]) => {
    setDismissed((current) => {
      const next = new Set([...current, ...ids])
      try {
        if (user) localStorage.setItem(storageKey(user.id), JSON.stringify([...next]))
      } catch {
        // Storage blocked: the dot comes back on reload, nothing else is lost.
      }
      return next
    })
  }

  return { notifications, unread: notifications.filter((item) => !item.read).length, markRead }
}
