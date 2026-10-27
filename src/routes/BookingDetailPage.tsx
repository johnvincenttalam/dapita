import { CalendarClockIcon, RepeatIcon, SearchXIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { MockNotice } from '@/components/shared/MockNotice'
import { Panel } from '@/components/shared/Panel'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { MessageShopButton } from '@/features/messaging/components/MessageShopButton'
import { Skeleton } from '@/components/ui/skeleton'
import { useBookingQuery } from '@/features/booking/api/queries'
import {
  AddToCalendarButton,
  CancelBookingButton,
  DirectionsButton,
  ProposalActions,
} from '@/features/booking/components/BookingActions'
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge'
import { AppointmentFacts, PriceBreakdown } from '@/features/booking/components/BookingSummary'
import { BookingTimeline } from '@/features/booking/components/BookingTimeline'
import { bookingHref } from '@/features/booking/links'
import { useShopQuery } from '@/features/shops/api/queries'
import { bookingHref as shopBookingHref, shopHref } from '@/features/shops/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { ApiError } from '@/lib/api-client'
import { bookingStatusMeta, canTransition, isTerminal } from '@/lib/booking-status'
import { formatAppointment } from '@/lib/format'
import type { BookingDetails } from '@/types/booking'

function BookingDetail({ booking }: { booking: BookingDetails }) {
  const now = useNow()
  // The shop's current policy text; the booking stores the version it was made under.
  const shop = useShopQuery(booking.business.slug)
  const policies = shop.data?.policies
  const started = new Date(booking.start) <= now
  const canCancel = canTransition(booking.status, 'cancel', 'customer') && !started
  const proposal = booking.proposal

  return (
    // Phones stack status, appointment, price and policy, then history. From `lg` the side
    // column spans both rows and the flexible second row absorbs its extra height.
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
      <div className="min-w-0 space-y-6 lg:col-start-1">
        <section aria-label="Status" className="space-y-3 rounded-3xl card-surface p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BookingStatusBadge status={booking.status} className="text-sm" />
            <p className="text-xs text-muted-foreground">
              Reference <span className="font-mono font-semibold text-foreground">{booking.reference}</span>
            </p>
          </div>
          <p className="text-pretty">{bookingStatusMeta[booking.status].customerDescription}</p>
          {booking.status === 'pending' && booking.respondBy ? (
            <p className="text-sm text-muted-foreground">
              The shop has until {formatAppointment(booking.respondBy)} to respond.
            </p>
          ) : null}

          {booking.status === 'alternative_proposed' && proposal ? (
            <Alert variant="info">
              <CalendarClockIcon aria-hidden="true" />
              <AlertTitle>New time proposed: {formatAppointment(proposal.start)}</AlertTitle>
              <AlertDescription className="space-y-3">
                {proposal.message ? <p>“{proposal.message}”</p> : null}
                <p>
                  You asked for {formatAppointment(booking.start)}.
                  {booking.respondBy ? ` Please answer by ${formatAppointment(booking.respondBy)}.` : ''}
                </p>
                <ProposalActions booking={booking} />
              </AlertDescription>
            </Alert>
          ) : null}
        </section>

        <Panel title="Appointment">
          <div>
            <p className="font-semibold">
              <Link to={shopHref(booking.business.slug)} className="underline-offset-4 hover:underline">
                {booking.business.name}
              </Link>
            </p>
            <p className="text-sm">{booking.service.name}</p>
          </div>
          <AppointmentFacts
            start={booking.start}
            staffName={booking.staffName}
            areaName={booking.business.areaName}
            durationMinutes={booking.service.durationMinutes}
          />
          <p className="text-sm text-muted-foreground">{booking.business.address}</p>
          {booking.notes ? (
            <p className="rounded-xl bg-muted/70 p-3 text-sm">
              <span className="font-semibold">Your notes: </span>
              {booking.notes}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {booking.status === 'confirmed' && !started ? <AddToCalendarButton booking={booking} /> : null}
            <DirectionsButton booking={booking} />
            <MessageShopButton businessId={booking.businessId} bookingId={booking.id} />
            {isTerminal(booking.status) ? (
              <Button asChild variant="outline" shape="pill">
                <Link to={shopBookingHref(booking.business.slug, booking.serviceId)}>
                  <RepeatIcon aria-hidden="true" />
                  Book again
                </Link>
              </Button>
            ) : null}
            {canCancel ? <CancelBookingButton booking={booking} policy={policies?.cancellation} /> : null}
          </div>
        </Panel>
      </div>

      <aside className="space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <Panel title="Price">
          <PriceBreakdown
            serviceName={booking.service.name}
            price={booking.service.price}
            deposit={policies?.deposit}
          />
        </Panel>
        {policies ? (
          <Panel title="Cancellation policy">
            <p className="text-sm text-pretty text-muted-foreground">{policies.cancellation}</p>
            {policies.version !== booking.policyVersion ? (
              <p className="text-xs text-muted-foreground">
                The shop has updated its policy since you booked. Contact the shop if anything is unclear.
              </p>
            ) : null}
          </Panel>
        ) : null}
        <MockNotice>Changes here are saved in this browser only. No shop is notified.</MockNotice>
      </aside>

      <div className="min-w-0 lg:col-start-1 lg:self-start">
        <Panel title="History">
          <BookingTimeline events={booking.events} />
        </Panel>
      </div>
    </div>
  )
}

/** Booking detail with status, proposed-time response, cancel and history (BKG-03, BKG-06, BKG-08). */
export default function BookingDetailPage() {
  const { bookingId = '' } = useParams()
  const booking = useBookingQuery(bookingId)
  useDocumentTitle(booking.data ? `${booking.data.service.name} · Booking` : 'Booking')

  return (
    <div className="space-y-5">
      <Breadcrumbs
        className="hidden md:block"
        minItems={2}
        labels={{ [bookingHref(bookingId)]: booking.data?.reference }}
      />
      <ScreenHeader
        title={booking.data ? booking.data.service.name : 'Booking details'}
        description={booking.data ? `at ${booking.data.business.name}` : undefined}
        backTo="/bookings"
      />
      {booking.isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : booking.isError ? (
        booking.error instanceof ApiError && booking.error.status === 404 ? (
          <EmptyState
            icon={SearchXIcon}
            title="We couldn’t find that booking"
            description="It may belong to another account."
            action={
              <Button asChild>
                <Link to="/bookings">Go to my bookings</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="We couldn’t load this booking"
            error={booking.error}
            onRetry={() => void booking.refetch()}
            isRetrying={booking.isRefetching}
          />
        )
      ) : (
        <BookingDetail booking={booking.data} />
      )}
    </div>
  )
}
