import { CalendarHeartIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { MockNotice } from '@/components/shared/MockNotice'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMyBookingsQuery } from '@/features/booking/api/queries'
import { BookingCard } from '@/features/booking/components/BookingCard'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { getBookingTab } from '@/lib/booking-status'
import type { BookingDetails, BookingTab } from '@/types/booking'

const tabs: { value: BookingTab; label: string; empty: string }[] = [
  { value: 'upcoming', label: 'Upcoming', empty: 'No upcoming bookings' },
  { value: 'past', label: 'Past', empty: 'No past bookings yet' },
  { value: 'cancelled', label: 'Cancelled', empty: 'No cancelled bookings' },
]

/** My Bookings with Upcoming / Past / Cancelled tabs (design screen 11, CUS-08). */
export default function MyBookingsPage() {
  useDocumentTitle('My bookings')
  const now = useNow()
  const [searchParams, setSearchParams] = useSearchParams()
  const bookings = useMyBookingsQuery()
  const requested = searchParams.get('tab')
  const tab: BookingTab = requested === 'past' || requested === 'cancelled' ? requested : 'upcoming'

  const grouped = useMemo(() => {
    const groups: Record<BookingTab, BookingDetails[]> = { upcoming: [], past: [], cancelled: [] }
    for (const booking of bookings.data ?? []) groups[getBookingTab(booking, now)].push(booking)
    // Soonest first for upcoming; most recent first otherwise.
    groups.past.reverse()
    groups.cancelled.reverse()
    return groups
  }, [bookings.data, now])

  return (
    <div className="space-y-5">
      <ScreenHeader title="My bookings" description="Requests and appointments, with their latest status." />

      <Tabs
        value={tab}
        onValueChange={(next) => setSearchParams(next === 'upcoming' ? {} : { tab: next }, { replace: true })}
        className="gap-5"
      >
        <TabsList variant="line" className="h-auto w-full justify-start border-b border-border/70 pb-0 md:w-fit">
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="flex-1">
              {item.label}
              {bookings.data ? (
                <span className="text-xs text-muted-foreground tabular-nums">({grouped[item.value].length})</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((item) => (
          <TabsContent key={item.value} value={item.value}>
            {bookings.isPending ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-36 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
              </div>
            ) : bookings.isError ? (
              <ErrorState
                title="We couldn’t load your bookings"
                error={bookings.error}
                onRetry={() => void bookings.refetch()}
                isRetrying={bookings.isRefetching}
              />
            ) : grouped[item.value].length === 0 ? (
              <EmptyState
                icon={CalendarHeartIcon}
                title={item.empty}
                description={item.value === 'upcoming' ? 'Find a barber, salon or spa and send a request.' : undefined}
                action={
                  item.value === 'upcoming' ? (
                    <Button asChild shape="pill">
                      <Link to="/explore">Explore shops</Link>
                    </Button>
                  ) : undefined
                }
                bordered
              />
            ) : (
              <ul aria-label={`${item.label} bookings`} className="grid gap-3 xl:grid-cols-2">
                {grouped[item.value].map((booking) => (
                  <li key={booking.id}>
                    <BookingCard booking={booking} />
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <MockNotice>
        These are sample bookings plus any requests you send, stored in this browser only. No real shop is involved.
      </MockNotice>
    </div>
  )
}
