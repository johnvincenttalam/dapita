import { useMemo } from 'react'

import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/api/queries'
import { useBusinessBookingsQuery, useRefetchAtNextExpiry } from '@/features/booking/api/merchant-queries'
import { useBusinessConversationsQuery } from '@/features/messaging/api/queries'
import { RecentMessagesPanel } from '@/features/merchant/components/RecentMessagesPanel'
import { TodayPanel } from '@/features/merchant/components/TodayPanel'
import { WaitingRequestsPanel } from '@/features/merchant/components/WaitingRequestsPanel'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { formatLongDate } from '@/lib/format'
import { greetingFor, summarizeDashboard } from '@/lib/merchant-dashboard'

/**
 * The merchant's first screen (design 12, MER-07): what needs an answer and who is
 * coming in today, and the latest messages. Revenue, ratings and "+ Add Booking" wait for P1 (plan Q7, C3).
 */
export default function MerchantDashboardPage() {
  useDocumentTitle('Dashboard')
  const now = useNow()
  const { user } = useSession()
  // MVP: one business per owner (plan §11.2 #13), as in `MerchantLayout`.
  const membership = user?.memberships[0]
  const list = useBusinessBookingsQuery(membership?.businessId)
  const conversations = useBusinessConversationsQuery(membership?.businessId)
  useRefetchAtNextExpiry(list.data, list.refetch)
  const summary = useMemo(() => summarizeDashboard(list.data ?? [], now), [list.data, now])

  const firstName = user?.name.split(' ')[0]
  const greeting = greetingFor(now)

  return (
    <div className="space-y-8">
      <PageHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description={[formatLongDate(now), membership?.businessName].filter(Boolean).join(' · ')}
      />

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} isRetrying={list.isRefetching} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {list.isPending ? (
            <>
              <Skeleton className="h-96 rounded-3xl" />
              <Skeleton className="h-96 rounded-3xl" />
            </>
          ) : (
            <>
              <WaitingRequestsPanel waiting={summary.waiting} proposedCount={summary.proposedCount} now={now} />
              <TodayPanel today={summary.today} nextSevenDays={summary.nextSevenDays} now={now} />
              {conversations.data ? <RecentMessagesPanel conversations={conversations.data} now={now} /> : null}
            </>
          )}
        </div>
      )}
    </div>
  )
}
