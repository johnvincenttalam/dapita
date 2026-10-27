import { ArrowLeftIcon, CalendarCheckIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useBusinessBookingQuery,
  useBusinessBookingsQuery,
  useCurrentBusinessId,
  useRefetchAtNextExpiry,
} from '@/features/booking/api/merchant-queries'
import { MerchantBookingDetail } from '@/features/merchant/components/MerchantBookingDetail'
import { MerchantBookingRow } from '@/features/merchant/components/MerchantBookingRow'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/use-now'
import { ApiError } from '@/lib/api-client'
import { groupMerchantBookings, merchantBookingHref, nextPendingId, type MerchantTab } from '@/lib/merchant-bookings'
import { cn } from '@/lib/utils'
import type { BookingDetails } from '@/types/booking'

const tabs: { value: MerchantTab; label: string; empty: string; description?: string }[] = [
  {
    value: 'requests',
    label: 'Requests',
    empty: 'No requests waiting',
    description: 'New requests from customers will appear here.',
  },
  { value: 'upcoming', label: 'Upcoming', empty: 'No upcoming appointments.' },
  { value: 'past', label: 'Past', empty: 'No past bookings yet.' },
]

const listHref = (tab: MerchantTab) => (tab === 'requests' ? '/business/bookings' : `/business/bookings?tab=${tab}`)

/**
 * Bookings (MER-04, BKG-02, BKG-03). From `lg` the list and the selected booking
 * sit side by side; below it, the list and a booking are separate screens:
 * `/business/bookings` shows only the list, `/business/bookings/:id` only the booking.
 */
export default function MerchantBookingsPage() {
  useDocumentTitle('Bookings')
  const now = useNow()
  const navigate = useNavigate()
  const isWide = useMediaQuery('(min-width: 1024px)')
  const { bookingId } = useParams()
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: MerchantTab = requested === 'upcoming' || requested === 'past' ? requested : 'requests'

  const list = useBusinessBookingsQuery(useCurrentBusinessId())
  const detailQuery = useBusinessBookingQuery(bookingId)
  const grouped = useMemo(() => groupMerchantBookings(list.data ?? [], now), [list.data, now])

  const rows = grouped[tab]
  const selectedId = bookingId ?? rows[0]?.id
  // Only a booking named in the URL gets a live detail (with actions). On the wide index route the first
  // row is about to be put in the URL, and answering before then could land on whichever row is first next.
  const selected: BookingDetails | undefined = bookingId
    ? (detailQuery.data ?? list.data?.find((booking) => booking.id === bookingId))
    : undefined
  const notFound = detailQuery.error instanceof ApiError && detailQuery.error.status === 404

  // On wide screens the first row opens beside the list. Its id goes in the URL so the pane stays on that
  // booking when the list changes underneath it (an answer that fails because the request just expired).
  const firstId = rows[0]?.id
  useEffect(() => {
    if (isWide && !bookingId && firstId) void navigate(merchantBookingHref(firstId, tab), { replace: true })
  }, [isWide, bookingId, firstId, tab, navigate])

  useRefetchAtNextExpiry(list.data, list.refetch)

  // After an answer, focus follows the work: the next request, or the empty list.
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const emptyRef = useRef<HTMLDivElement>(null)
  const settled = !list.isFetching
  useEffect(() => {
    if (!focusTarget) return
    // The wanted row, else the first row (e.g. only proposed times are left), else the empty state.
    const target =
      (focusTarget === 'empty' ? null : document.getElementById(`booking-row-${focusTarget}`)) ??
      document.querySelector<HTMLElement>('[id^="booking-row-"]') ??
      emptyRef.current
    target?.focus()
    // Give up once the list has settled, so a stale target can't grab focus later.
    if (target || settled) setFocusTarget(null)
  }, [focusTarget, rows, settled])

  const onAnswered = (answered: BookingDetails) => {
    const next = nextPendingId(grouped, answered.id)
    void navigate(isWide && next ? merchantBookingHref(next, 'requests') : listHref('requests'), { replace: true })
    setFocusTarget(next ?? 'empty')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bookings" description="Answer requests before they expire." />

      <Tabs
        value={tab}
        onValueChange={(next) => void navigate(listHref(next as MerchantTab), { replace: true })}
        className="gap-5"
      >
        <TabsList
          variant="line"
          className={cn(
            'h-auto w-full justify-start border-b border-border/70 pb-0 md:w-fit',
            // A phone showing one booking has a back link instead.
            bookingId && 'max-lg:hidden',
          )}
        >
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="flex-1">
              {item.label}
              {list.data ? (
                <span className="text-xs text-muted-foreground tabular-nums">({grouped[item.value].length})</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((item) => (
          <TabsContent key={item.value} value={item.value}>
            <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-8">
              <div className={cn('min-w-0', bookingId && 'hidden lg:block')}>
                {list.isPending ? (
                  <ul aria-label={`Loading ${item.label.toLowerCase()}`} className="space-y-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <li key={index}>
                        <Skeleton className="h-22 rounded-2xl" />
                      </li>
                    ))}
                  </ul>
                ) : list.isError ? (
                  <ErrorState error={list.error} onRetry={() => void list.refetch()} isRetrying={list.isRefetching} />
                ) : rows.length === 0 ? (
                  <div ref={emptyRef} tabIndex={-1} className="outline-none">
                    <EmptyState icon={CalendarCheckIcon} title={item.empty} description={item.description} bordered />
                  </div>
                ) : (
                  <ul aria-label={item.label} className="space-y-2">
                    {rows.map((booking) => (
                      <li key={booking.id}>
                        <MerchantBookingRow
                          booking={booking}
                          now={now}
                          // Below lg the index route shows no booking, so nothing is marked as open.
                          selected={booking.id === selectedId && (Boolean(bookingId) || isWide)}
                          to={merchantBookingHref(booking.id, tab)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={cn('min-w-0 lg:sticky lg:top-24 lg:self-start', !bookingId && 'hidden lg:block')}>
                {bookingId ? (
                  <Button asChild variant="ghost" shape="pill" size="sm" className="mb-3 -ml-2 lg:hidden">
                    <Link to={listHref(tab)}>
                      <ArrowLeftIcon aria-hidden="true" />
                      All bookings
                    </Link>
                  </Button>
                ) : null}
                {notFound ? (
                  <ErrorState
                    title="We couldn’t find that booking."
                    description="It may belong to another shop, or the link is wrong."
                    action={
                      <Button asChild variant="outline" shape="pill">
                        <Link to={listHref(tab)}>All bookings</Link>
                      </Button>
                    }
                  />
                ) : selected ? (
                  <div className="rounded-3xl card-surface p-5 sm:p-6">
                    <MerchantBookingDetail
                      key={selected.id}
                      booking={selected}
                      bookings={list.data ?? []}
                      onAnswered={onAnswered}
                    />
                  </div>
                ) : (bookingId && (detailQuery.isPending || list.isPending)) || (!bookingId && rows.length > 0) ? (
                  <Skeleton className="h-96 rounded-3xl" />
                ) : bookingId && detailQuery.isError ? (
                  <ErrorState
                    error={detailQuery.error}
                    onRetry={() => void detailQuery.refetch()}
                    isRetrying={detailQuery.isRefetching}
                  />
                ) : null}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
