import { formatAppointment } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BookingAction, BookingActor, BookingEvent } from '@/types/booking'

type Viewer = 'customer' | 'merchant'

const actorNames: Record<Viewer, Record<BookingActor, string>> = {
  customer: { customer: 'You', merchant: 'The shop', admin: 'Support', system: '' },
  merchant: { customer: 'The customer', merchant: 'You', admin: 'Support', system: '' },
}

const actionText: Record<BookingAction, string> = {
  submit: 'sent the request',
  accept: 'confirmed the booking',
  decline: 'declined the request',
  propose_alternative: 'proposed another time',
  accept_alternative: 'accepted the new time',
  decline_alternative: 'kept the original time',
  cancel: 'cancelled',
  expire: 'Closed automatically: no response in time',
  complete: 'marked it completed',
  mark_no_show: 'marked it as a no-show',
}

/** The audit trail as a history (BKG-08), oldest first, worded for whoever is viewing it. */
export function BookingTimeline({ events, viewer = 'customer' }: { events: BookingEvent[]; viewer?: Viewer }) {
  const names = actorNames[viewer]
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((event, index) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1.5 -left-[1.6875rem] size-3 rounded-full ring-4 ring-background',
              index === events.length - 1 ? 'bg-primary' : 'bg-border',
            )}
          />
          <p className="text-sm">
            {names[event.actor] ? <span className="font-medium">{names[event.actor]} </span> : null}
            {actionText[event.action]}
          </p>
          <p className="text-xs text-muted-foreground">
            <time dateTime={event.at}>{formatAppointment(event.at)}</time>
          </p>
          {event.reason ? <p className="mt-1 text-sm text-pretty text-muted-foreground">“{event.reason}”</p> : null}
        </li>
      ))}
    </ol>
  )
}
