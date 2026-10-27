import { useId } from 'react'
import { Link } from 'react-router'

import { CalendarEntryLink } from '@/features/merchant/components/calendar/CalendarEntryLink'
import { toDateKey, zonedDateTime } from '@/lib/datetime'
import { formatLongDate, formatMonthDay, formatWeekday } from '@/lib/format'
import type { CalendarEntry } from '@/lib/merchant-calendar'
import { formatTimeRange, isClosedOn } from '@/lib/opening-hours'
import { cn } from '@/lib/utils'
import type { ClosurePeriod, WeeklyHours } from '@/types/business'
import type { DateKey } from '@/types/common'
import { weekdayOf } from '@/lib/datetime'

interface WeekScheduleProps {
  days: DateKey[]
  entries: CalendarEntry[]
  hours: WeeklyHours
  closures: ClosurePeriod[]
  now: Date
  dayHref: (date: DateKey) => string
}

function Day({ date, entries, hours, closures, now, dayHref }: Omit<WeekScheduleProps, 'days'> & { date: DateKey }) {
  const id = useId()
  const noon = zonedDateTime(date, '12:00')
  const isToday = toDateKey(now) === date
  const closure = closures.find((candidate) => isClosedOn([candidate], date))
  const ranges = hours[weekdayOf(date)]
  const opening = closure
    ? `Closed${closure.reason ? `: ${closure.reason}` : ''}`
    : ranges.length
      ? ranges.map(formatTimeRange).join(', ')
      : 'Closed'

  return (
    <section aria-labelledby={id} className="min-w-0 space-y-2">
      <h3 id={id} className="sr-only">
        {formatLongDate(noon)}
      </h3>
      <Link
        to={dayHref(date)}
        aria-label={`Open ${formatLongDate(noon)}`}
        className={cn(
          'flex items-baseline justify-between gap-2 rounded-xl px-2 py-1.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:flex-col lg:items-start lg:gap-0',
          isToday && 'bg-accent text-accent-foreground hover:bg-accent',
        )}
      >
        <span className="font-semibold">
          {formatWeekday(noon)} {formatMonthDay(noon)}
          {isToday ? <span className="ml-1.5 type-micro">Today</span> : null}
        </span>
        <span className="truncate text-xs opacity-80">{opening}</span>
      </Link>
      {entries.length ? (
        <ul className="space-y-1.5">
          {entries.map((entry) => (
            <li key={entry.booking.id}>
              <CalendarEntryLink entry={entry} now={now} variant="row" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 text-sm text-muted-foreground">No appointments</p>
      )}
    </section>
  )
}

/** Seven days side by side from `lg`; a list of days below it. Each day heading opens that day. */
export function WeekSchedule({ days, entries, ...rest }: WeekScheduleProps) {
  return (
    <div className="grid gap-x-3 gap-y-6 rounded-3xl card-surface p-4 sm:p-5 lg:grid-cols-7">
      {days.map((date) => (
        <Day
          key={date}
          date={date}
          entries={entries.filter((entry) => toDateKey(new Date(entry.start)) === date)}
          {...rest}
        />
      ))}
    </div>
  )
}
