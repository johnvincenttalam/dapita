import { ArrowRightIcon, CalendarIcon } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { formatDuration, formatTime } from '@/lib/format'
import { getMerchantTab, merchantBookingHref } from '@/lib/merchant-bookings'
import type { AppointmentPhase, DashboardSummary } from '@/lib/merchant-dashboard'
import { cn } from '@/lib/utils'

const phaseLabel: Record<AppointmentPhase, string | null> = {
  done: 'Done',
  now: 'In progress',
  next: 'Next',
  later: null,
}

interface TodayPanelProps {
  today: DashboardSummary['today']
  nextSevenDays: number
  now: Date
}

/** Today's confirmed appointments in time order. Phases are plain labels, not status colours (DESIGN.md). */
export function TodayPanel({ today, nextSevenDays, now }: TodayPanelProps) {
  const done = today.filter((row) => row.phase === 'done').length
  const count = `${today.length} ${today.length === 1 ? 'appointment' : 'appointments'}`

  return (
    <Panel title="Today" description={today.length > 0 ? (done > 0 ? `${count} · ${done} done` : count) : undefined}>
      {today.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No appointments today"
          description="Confirmed bookings for today will show up here."
          className="py-6"
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {today.map(({ booking, phase }) => (
            <li key={booking.id}>
              <Link
                to={merchantBookingHref(booking.id, getMerchantTab(booking, now))}
                className={cn(
                  'grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50',
                  phase === 'done' && 'text-muted-foreground',
                )}
              >
                <span className="tabular-nums">
                  <span className="block text-sm font-medium">{formatTime(booking.start)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDuration(booking.service.durationMinutes)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className={cn('block truncate', phase !== 'done' && 'font-semibold')}>
                    {booking.contact.name}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {booking.service.name} · {booking.staffName ?? 'Any staff'}
                  </span>
                </span>
                {phaseLabel[phase] ? (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 type-micro',
                      phase === 'done' ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground',
                    )}
                  >
                    {phaseLabel[phase]}
                  </span>
                ) : (
                  <span />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 pt-4">
        <p className="text-sm text-muted-foreground">
          {nextSevenDays > 0
            ? `${nextSevenDays} more confirmed in the next 7 days.`
            : 'Nothing confirmed for the next 7 days yet.'}
        </p>
        <Button asChild variant="ghost" shape="pill" size="sm" className="-mr-2 ml-auto">
          <Link to="/business/bookings?tab=upcoming">
            Upcoming bookings
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Panel>
  )
}
