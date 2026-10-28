import { CalendarIcon, ChevronRightIcon, MapPinIcon, StoreIcon } from 'lucide-react'
import { Link } from 'react-router'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { Button } from '@/components/ui/button'
import { market } from '@/config/market'
import { AddToCalendarButton } from '@/features/booking/components/BookingActions'
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge'
import { bookingHref } from '@/features/booking/links'
import { formatFullDate, formatTime } from '@/lib/format'
import type { BookingDetails } from '@/types/booking'

/** One booking in "My Bookings" (design screen 11). */
export function BookingCard({ booking }: { booking: BookingDetails }) {
  const shown = booking.proposal?.start ?? booking.start
  const canAddToCalendar = booking.status === 'confirmed' && new Date(booking.start) > new Date()

  return (
    <article className="space-y-3 rounded-2xl card-surface p-4">
      <div className="flex gap-3">
        <ImageWithFallback
          src={booking.business.coverPhotoUrl}
          alt=""
          icon={StoreIcon}
          className="size-16 shrink-0 rounded-xl sm:size-18"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-semibold text-pretty">{booking.business.name}</h3>
          <p className="text-sm font-medium">
            {booking.service.name}
            {booking.staffName ? ` with ${booking.staffName}` : ''}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span>
              {booking.proposal ? <span className="font-medium text-info-emphasis">Proposed: </span> : null}
              {formatFullDate(shown)} · {formatTime(shown)}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
            {booking.business.areaName}, {market.city}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BookingStatusBadge status={booking.status} />
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {canAddToCalendar ? <AddToCalendarButton booking={booking} /> : null}
          {/* Outlined, not tinted: a tinted pill next to the status badge reads as another badge. */}
          <Button asChild shape="pill" variant={booking.status === 'alternative_proposed' ? 'default' : 'outline'}>
            <Link to={bookingHref(booking.id)}>
              {booking.status === 'alternative_proposed' ? 'Review new time' : 'View details'}
              <span className="sr-only">
                {' '}
                for {booking.service.name} at {booking.business.name}
              </span>
              <ChevronRightIcon aria-hidden="true" data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}
