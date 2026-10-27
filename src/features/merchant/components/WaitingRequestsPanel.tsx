import { ArrowRightIcon, CalendarCheckIcon, Clock3Icon } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { formatDay, formatTime } from '@/lib/format'
import { formatAnswerBy, merchantBookingHref } from '@/lib/merchant-bookings'
import { cn } from '@/lib/utils'
import type { BookingDetails } from '@/types/booking'

/** The dashboard shows the most urgent few; the Bookings page has the rest. */
const shown = 5

interface WaitingRequestsPanelProps {
  waiting: BookingDetails[]
  proposedCount: number
  now: Date
}

/** "Needs your answer": pending requests by deadline. Urgency is wording and weight, never a status colour. */
export function WaitingRequestsPanel({ waiting, proposedCount, now }: WaitingRequestsPanelProps) {
  const note =
    proposedCount > 0
      ? `${proposedCount} new ${proposedCount === 1 ? 'time' : 'times'} waiting for the customer.`
      : waiting.length > shown
        ? `${waiting.length - shown} more on the Bookings page.`
        : null

  return (
    <Panel
      title="Needs your answer"
      description={
        waiting.length > 0
          ? `${waiting.length} waiting. Answer before the deadline, or the request expires.`
          : 'New booking requests from customers land here first.'
      }
    >
      {waiting.length === 0 ? (
        <EmptyState
          icon={CalendarCheckIcon}
          title="You’re all caught up"
          description="Nothing is waiting for your answer."
          className="py-6"
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {waiting.slice(0, shown).map((booking) => {
            const deadline = booking.respondBy ? formatAnswerBy(booking.respondBy, now) : null
            return (
              <li key={booking.id}>
                <Link
                  to={merchantBookingHref(booking.id, 'requests')}
                  className="flex items-start justify-between gap-3 rounded-xl px-2 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{booking.contact.name}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {booking.service.name} · {booking.staffName ?? 'Any staff'}
                    </span>
                    {deadline ? (
                      <span
                        className={cn(
                          'mt-1 flex items-center gap-1.5 text-xs',
                          deadline.urgent ? 'font-medium text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {deadline.urgent ? <Clock3Icon aria-hidden="true" className="size-3.5" /> : null}
                        {deadline.text}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    <span className="block">{formatDay(booking.start)}</span>
                    <span className="block text-muted-foreground">{formatTime(booking.start)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 pt-4">
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
        <Button asChild variant="ghost" shape="pill" size="sm" className="-mr-2 ml-auto">
          <Link to="/business/bookings">
            All requests
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Panel>
  )
}
