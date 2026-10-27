import { useMemo } from 'react'

import { SidebarNote } from '@/components/layouts/AppSidebar'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { merchantNav } from '@/config/navigation'
import { useSession } from '@/features/auth/api/queries'
import { useBusinessBookingsQuery } from '@/features/booking/api/merchant-queries'
import { useBusinessProfileQuery } from '@/features/merchant/api/business-queries'
import { ListingStatusBanner } from '@/features/merchant/components/ListingStatusBanner'
import { useBusinessConversationsQuery } from '@/features/messaging/api/queries'
import { env } from '@/lib/env'

/** Merchant dashboard ("Dapita for Business", design screen 12). Rendered behind RequireRole. */
export function MerchantLayout() {
  const { user } = useSession()
  // MVP: one business per owner (plan §11.2 #13); a business switcher comes with multi-branch support.
  const membership = user?.memberships[0]
  const bookings = useBusinessBookingsQuery(membership?.businessId)
  const waiting = bookings.data?.filter((booking) => booking.status === 'pending').length ?? 0
  const profile = useBusinessProfileQuery(membership?.businessId)
  const status = profile.data?.business.status
  const conversations = useBusinessConversationsQuery(membership?.businessId)
  const unread = conversations.data?.reduce((total, conversation) => total + conversation.unreadCount, 0) ?? 0

  const nav = useMemo(
    () =>
      merchantNav.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.to === '/business/bookings'
            ? { ...item, count: waiting }
            : item.to === '/business/messages'
              ? { ...item, count: unread, countLabel: 'unread' }
              : item,
        ),
      })),
    [waiting, unread],
  )

  return (
    <DashboardLayout
      nav={nav}
      label="Business dashboard"
      homeTo="/business"
      brandSubtitle="for Business"
      notifications="merchant"
      accountTitle={membership?.businessName}
      accountSubtitle={membership ? (membership.role === 'owner' ? 'Owner' : 'Staff') : undefined}
      footer={<SidebarNote>{env.useMocks ? 'Prototype · mock data' : 'Pilot server · demo data'}</SidebarNote>}
      banner={status ? <ListingStatusBanner status={status} note={profile.data?.business.moderationNote} /> : null}
    />
  )
}
