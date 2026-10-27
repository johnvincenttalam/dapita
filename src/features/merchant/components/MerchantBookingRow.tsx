import { Clock3Icon } from 'lucide-react'
import { Link } from 'react-router'

import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge'
import { formatAppointment } from '@/lib/format'
import { formatAnswerBy } from '@/lib/merchant-bookings'
import { cn } from '@/lib/utils'
import type { BookingDetails } from '@/types/booking'

interface MerchantBookingRowProps {
  booking: BookingDetails
  now: Date
  selected: boolean
  to: string
}

/** One row of the Bookings list. Urgency is wording and weight only: status colours mean state (DESIGN.md). */
export function MerchantBookingRow({ booking, now, selected, to }: MerchantBookingRowProps) {
  const deadline = booking.status === 'pending' && booking.respondBy ? formatAnswerBy(booking.respondBy, now) : null

  return (
    <Link
      to={to}
      id={`booking-row-${booking.id}`}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'block rounded-2xl card-surface px-4 py-3 transition-shadow outline-none',
        'hover:ring-1 hover:ring-border focus-visible:ring-3 focus-visible:ring-ring/50',
        selected && 'ring-2 ring-primary hover:ring-2 hover:ring-primary',
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate font-semibold">{booking.contact.name}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {booking.service.name} · {booking.staffName ?? 'Any staff'}
          </span>
          <span className="block text-sm">{formatAppointment(booking.start)}</span>
        </span>
        {booking.status !== 'pending' && booking.status !== 'alternative_proposed' ? (
          <BookingStatusBadge status={booking.status} className="shrink-0" />
        ) : null}
      </span>
      {deadline ? (
        <span
          className={cn(
            'mt-1.5 flex items-center gap-1.5 text-xs',
            deadline.urgent ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          {deadline.urgent ? <Clock3Icon aria-hidden="true" className="size-3.5" /> : null}
          {deadline.text}
        </span>
      ) : null}
      {booking.status === 'alternative_proposed' ? (
        <span className="mt-1.5 block text-xs text-muted-foreground">New time proposed · waiting for customer</span>
      ) : null}
    </Link>
  )
}
