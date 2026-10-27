import { CalendarCheck2Icon, ClockIcon, SearchXIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingIndicator } from '@/components/feedback/LoadingIndicator'
import { MockNotice } from '@/components/shared/MockNotice'
import { Button } from '@/components/ui/button'
import { useBookingQuery } from '@/features/booking/api/queries'
import { AddToCalendarButton, DirectionsButton } from '@/features/booking/components/BookingActions'
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge'
import { AppointmentFacts } from '@/features/booking/components/BookingSummary'
import { bookingHref } from '@/features/booking/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApiError } from '@/lib/api-client'
import { bookingStatusMeta } from '@/lib/booking-status'
import { formatAppointment } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * After submitting (design screen 7). In request mode this is the pending
 * variant: "Request sent", never "Booking confirmed" (doc §7.3, plan C1).
 */
export default function BookingSubmittedPage() {
  const { bookingId = '' } = useParams()
  const booking = useBookingQuery(bookingId)
  const status = booking.data?.status
  const confirmed = status === 'confirmed'
  useDocumentTitle(confirmed ? 'Booking confirmed' : 'Request sent')

  if (booking.isPending) return <LoadingIndicator label="Loading your booking…" />
  if (booking.isError) {
    return booking.error instanceof ApiError && booking.error.status === 404 ? (
      <EmptyState
        icon={SearchXIcon}
        title="We couldn’t find that booking"
        action={
          <Button asChild>
            <Link to="/bookings">Go to my bookings</Link>
          </Button>
        }
      />
    ) : (
      <ErrorState error={booking.error} onRetry={() => void booking.refetch()} isRetrying={booking.isRefetching} />
    )
  }

  const data = booking.data
  const Icon = confirmed ? CalendarCheck2Icon : ClockIcon
  const title = confirmed
    ? 'Booking confirmed!'
    : status === 'pending'
      ? 'Request sent!'
      : bookingStatusMeta[data.status].label

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-3 text-center">
        <span
          className={cn(
            'mx-auto flex size-20 items-center justify-center rounded-full shadow-md',
            confirmed ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary',
          )}
        >
          <Icon aria-hidden="true" className="size-9" strokeWidth={2.25} />
        </span>
        <h1 className="type-title">{title}</h1>
        <p className="text-pretty text-muted-foreground">
          {status === 'pending'
            ? `${data.business.name} will confirm your preferred time. It isn’t booked until they do.`
            : bookingStatusMeta[data.status].customerDescription}
        </p>
      </div>

      <section aria-labelledby="submitted-summary" className="space-y-4 rounded-3xl card-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="submitted-summary" className="font-semibold">
              {data.business.name}
            </h2>
            <p className="text-sm">
              {data.service.name}
              {data.staffName ? ` with ${data.staffName}` : ''}
            </p>
          </div>
          <BookingStatusBadge status={data.status} className="shrink-0" />
        </div>
        <AppointmentFacts start={data.start} areaName={data.business.areaName} />
        {data.respondBy && data.status === 'pending' ? (
          <p className="rounded-xl bg-muted/70 p-3 text-sm">
            The shop has until <span className="font-semibold">{formatAppointment(data.respondBy)}</span> to respond.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Reference <span className="font-mono font-semibold text-foreground">{data.reference}</span>
        </p>
      </section>

      <MockNotice>This request exists only in this browser. No shop has received it.</MockNotice>

      <div className="space-y-3">
        {confirmed ? <AddToCalendarButton booking={data} /> : null}
        <Button asChild size="xl" shape="pill" fullWidth>
          <Link to={bookingHref(data.id)}>View booking</Link>
        </Button>
        <div className="flex flex-wrap justify-center gap-2">
          <DirectionsButton booking={data} size="sm" />
          <Button asChild variant="ghost" shape="pill" size="sm">
            <Link to="/explore">Explore more shops</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
