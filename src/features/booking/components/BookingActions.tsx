import { CalendarPlusIcon, CheckIcon, NavigationIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { bookingRules } from '@/config/booking'
import {
  useAcceptAlternativeMutation,
  useCancelBookingMutation,
  useDeclineAlternativeMutation,
} from '@/features/booking/api/queries'
import { directionsHref } from '@/features/shops/links'
import { downloadIcs } from '@/lib/calendar'
import { formatAppointment } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BookingDetails } from '@/types/booking'

type ButtonSize = 'sm' | 'default'

/** Downloads an .ics file. Offered for confirmed bookings only, never for pending requests. */
export function AddToCalendarButton({ booking, size = 'default' }: { booking: BookingDetails; size?: ButtonSize }) {
  return (
    <Button
      variant="outline"
      shape="pill"
      size={size}
      onClick={() =>
        downloadIcs(
          {
            uid: `${booking.id}@dapita`,
            title: `${booking.service.name} at ${booking.business.name}`,
            start: booking.start,
            end: booking.end,
            location: booking.business.address,
            description: `Booking reference ${booking.reference}`,
          },
          `${booking.reference}.ics`,
        )
      }
    >
      <CalendarPlusIcon aria-hidden="true" />
      Add to calendar
    </Button>
  )
}

export function DirectionsButton({ booking, size = 'default' }: { booking: BookingDetails; size?: ButtonSize }) {
  return (
    <Button asChild variant="outline" shape="pill" size={size}>
      <a
        href={directionsHref(`${booking.business.name}, ${booking.business.address}`)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <NavigationIcon aria-hidden="true" />
        Get directions
        <span className="sr-only"> (opens Google Maps in a new tab)</span>
      </a>
    </Button>
  )
}

/**
 * Cancel with the shop's policy shown first (BKG-06). The reason is optional
 * and recorded in the booking history (BKG-08).
 */
export function CancelBookingButton({ booking, policy }: { booking: BookingDetails; policy?: string }) {
  const cancel = useCancelBookingMutation()
  const [reason, setReason] = useState('')
  const isRequest = booking.status !== 'confirmed'

  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          shape="pill"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <XIcon aria-hidden="true" />
          {isRequest ? 'Cancel request' : 'Cancel booking'}
        </Button>
      }
      destructive
      title={isRequest ? 'Cancel this request?' : 'Cancel this booking?'}
      description={
        <span className="block space-y-3 text-left">
          <span className="block">
            {booking.service.name} at {booking.business.name}, {formatAppointment(booking.start)}.
          </span>
          {policy ? (
            <span className="block rounded-lg bg-muted p-3 text-foreground">
              <span className="font-semibold">Cancellation policy: </span>
              {policy}
            </span>
          ) : null}
          <span className="block space-y-1.5">
            <Label htmlFor={`cancel-reason-${booking.id}`} className="text-foreground">
              Reason (optional)
            </Label>
            <Textarea
              id={`cancel-reason-${booking.id}`}
              rows={2}
              maxLength={bookingRules.reasonMaxLength}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </span>
        </span>
      }
      confirmLabel={isRequest ? 'Cancel request' : 'Cancel booking'}
      cancelLabel="Keep it"
      onConfirm={async () => {
        await cancel.mutateAsync({ id: booking.id, reason: reason.trim() || undefined })
      }}
    />
  )
}

/** Accept or decline a time proposed by the shop (BKG-03). Only acceptance confirms the booking. */
export function ProposalActions({ booking, className }: { booking: BookingDetails; className?: string }) {
  const accept = useAcceptAlternativeMutation()
  const decline = useDeclineAlternativeMutation()
  const busy = accept.isPending || decline.isPending

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button shape="pill" loading={accept.isPending} disabled={busy} onClick={() => accept.mutate(booking.id)}>
        {!accept.isPending && <CheckIcon aria-hidden="true" />}
        Accept new time
      </Button>
      <Button
        variant="outline"
        shape="pill"
        loading={decline.isPending}
        disabled={busy}
        onClick={() => decline.mutate(booking.id)}
      >
        {!decline.isPending && <RotateCcwIcon aria-hidden="true" />}
        Keep my original time
      </Button>
    </div>
  )
}
