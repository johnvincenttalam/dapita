import { useQueryClient } from '@tanstack/react-query'
import { CalendarClockIcon, CheckIcon, XIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { bookingKeys } from '@/features/booking/api/queries'
import { useRespondToBookingMutation } from '@/features/booking/api/merchant-queries'
import { BookingStatusBadge } from '@/features/booking/components/BookingStatusBadge'
import { BookingTimeline } from '@/features/booking/components/BookingTimeline'
import { ClashNote } from '@/features/merchant/components/ClashNote'
import { DeclineReasonDialog } from '@/features/merchant/components/DeclineReasonDialog'
import { ProposeTimeDialog } from '@/features/merchant/components/ProposeTimeDialog'
import { useShopQuery } from '@/features/shops/api/queries'
import { useNow } from '@/hooks/use-now'
import { availableActions, bookingStatusMeta } from '@/lib/booking-status'
import { formatAppointment, formatDuration, formatPrice } from '@/lib/format'
import { describeClash, findClashes, formatAnswerBy } from '@/lib/merchant-bookings'
import type { MerchantResponse } from '@/services/bookings.service'
import type { BookingDetails } from '@/types/booking'

interface MerchantBookingDetailProps {
  booking: BookingDetails
  /** The shop's bookings, for the clash check. */
  bookings: BookingDetails[]
  /** Called with the server's copy after a successful answer. */
  onAnswered: (booking: BookingDetails) => void
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** One booking as the shop sees it, with accept / propose / decline (MER-04, BKG-02, BKG-03). */
export function MerchantBookingDetail({ booking, bookings, onAnswered }: MerchantBookingDetailProps) {
  const now = useNow()
  const queryClient = useQueryClient()
  const respond = useRespondToBookingMutation()
  const shop = useShopQuery(booking.business.slug)
  const [dialog, setDialog] = useState<'decline' | 'propose' | null>(null)

  const actions = availableActions(booking.status, 'merchant')
  const name = booking.contact.name
  const busy = respond.isPending
  const deadline = booking.status === 'pending' && booking.respondBy ? formatAnswerBy(booking.respondBy, now) : null
  const clashText =
    booking.status === 'pending'
      ? describeClash(findClashes(booking, booking.start, booking.end, bookings), booking.staffName)
      : undefined

  const answer = async (response: MerchantResponse, success: string) => {
    try {
      const result = await respond.mutateAsync({ id: booking.id, response })
      toast.success(success)
      onAnswered(result)
    } catch (error) {
      // The query client already toasts the error; refetch so an expired or cancelled booking shows as it is now.
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all })
      throw error
    }
  }

  return (
    <article aria-labelledby={`booking-${booking.id}-title`} className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`booking-${booking.id}-title`} className="type-heading">
            {name}
          </h2>
          <BookingStatusBadge status={booking.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {bookingStatusMeta[booking.status].merchantDescription}
          {deadline ? (
            <span className={deadline.urgent ? 'font-medium text-foreground' : undefined}> {deadline.text}.</span>
          ) : null}
        </p>
      </header>

      <dl className="divide-y divide-border/70">
        <Fact label="Service">
          {booking.service.name} · {formatDuration(booking.service.durationMinutes)}
        </Fact>
        <Fact label="Requested">
          <span className="font-medium">{formatAppointment(booking.start)}</span>
        </Fact>
        <Fact label="Staff">{booking.staffName ?? 'Any staff'}</Fact>
        <Fact label="Price">{formatPrice(booking.service.price)}</Fact>
        {booking.contact.phone ? (
          <Fact label="Mobile">
            <a href={`tel:${booking.contact.phone}`} className="underline-offset-4 hover:underline">
              {booking.contact.phone}
            </a>
          </Fact>
        ) : null}
        <Fact label="Email">
          <a href={`mailto:${booking.contact.email}`} className="underline-offset-4 hover:underline">
            {booking.contact.email}
          </a>
        </Fact>
        <Fact label="Reference">
          <span className="tabular-nums">{booking.reference}</span>
        </Fact>
      </dl>

      {booking.notes ? (
        <div className="space-y-1">
          <h3 className="type-label text-muted-foreground">Note from {name}</h3>
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-pretty">“{booking.notes}”</p>
        </div>
      ) : null}

      {booking.status === 'alternative_proposed' && booking.proposal ? (
        <div className="space-y-1 rounded-2xl bg-muted px-4 py-3 text-sm">
          <p>
            You proposed <span className="font-medium">{formatAppointment(booking.proposal.start)}</span>.
          </p>
          {booking.proposal.message ? <p className="text-muted-foreground">“{booking.proposal.message}”</p> : null}
          {booking.respondBy ? (
            <p className="text-muted-foreground">
              The customer has until {formatAppointment(booking.respondBy)} to answer.
            </p>
          ) : null}
        </div>
      ) : null}

      <ClashNote text={clashText} />

      {actions.includes('accept') || actions.includes('propose_alternative') || actions.includes('decline') ? (
        <div className="flex flex-wrap gap-2">
          {actions.includes('accept') ? (
            <Button
              shape="pill"
              loading={busy && respond.variables?.response.action === 'accept'}
              disabled={busy}
              onClick={() =>
                void answer({ action: 'accept' }, `Booking confirmed. ${name} can see it now.`).catch(() => {})
              }
            >
              {!(busy && respond.variables?.response.action === 'accept') && <CheckIcon aria-hidden="true" />}
              Accept
            </Button>
          ) : null}
          {actions.includes('propose_alternative') ? (
            <Button variant="outline" shape="pill" disabled={busy || !shop.data} onClick={() => setDialog('propose')}>
              <CalendarClockIcon aria-hidden="true" />
              Propose time
            </Button>
          ) : null}
          {actions.includes('decline') ? (
            <Button
              variant="ghost"
              shape="pill"
              disabled={busy}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDialog('decline')}
            >
              <XIcon aria-hidden="true" />
              Decline
            </Button>
          ) : null}
        </div>
      ) : null}

      {booking.events.length > 0 ? (
        <section aria-labelledby={`booking-${booking.id}-history`} className="space-y-3">
          <h3 id={`booking-${booking.id}-history`} className="type-subheading">
            History
          </h3>
          <BookingTimeline events={booking.events} viewer="merchant" />
        </section>
      ) : null}

      <DeclineReasonDialog
        customerName={name}
        open={dialog === 'decline'}
        onOpenChange={(open) => setDialog(open ? 'decline' : null)}
        onSubmit={(reason) => answer({ action: 'decline', reason }, 'Request declined.')}
      />
      {shop.data ? (
        <ProposeTimeDialog
          booking={booking}
          hours={shop.data.hours}
          closures={shop.data.closures}
          bookings={bookings}
          now={now}
          open={dialog === 'propose'}
          onOpenChange={(open) => setDialog(open ? 'propose' : null)}
          onSubmit={({ start, message }) =>
            answer({ action: 'propose_alternative', start, message }, `New time sent to ${name}.`)
          }
        />
      ) : null}
    </article>
  )
}
