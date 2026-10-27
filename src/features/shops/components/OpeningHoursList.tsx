import { CalendarOffIcon } from 'lucide-react'

import { useNow } from '@/hooks/use-now'
import { toDateKey, weekdayOf, zonedDateTime } from '@/lib/datetime'
import { formatDay } from '@/lib/format'
import { weeklySchedule } from '@/lib/opening-hours'
import { cn } from '@/lib/utils'
import type { ClosurePeriod, WeeklyHours } from '@/types/business'

interface OpeningHoursListProps {
  hours: WeeklyHours
  closures: ClosurePeriod[]
  className?: string
}

const dayLabel = (dateKey: string) => formatDay(zonedDateTime(dateKey, '12:00'))

/** Weekly hours with today highlighted, plus upcoming closure dates (MER-03, CUS-05). */
export function OpeningHoursList({ hours, closures, className }: OpeningHoursListProps) {
  const now = useNow()
  const today = toDateKey(now)
  const todayWeekday = weekdayOf(today)
  const upcomingClosures = closures.filter((closure) => closure.endDate >= today)

  return (
    <div className={cn('space-y-4', className)}>
      <dl className="divide-y divide-border/70 text-sm">
        {weeklySchedule(hours).map(({ weekday, name, ranges }) => {
          const isToday = weekday === todayWeekday
          return (
            <div key={weekday} className={cn('flex justify-between gap-4 py-2', isToday && 'font-semibold')}>
              <dt>
                {name}
                {isToday ? <span className="ml-2 text-xs font-medium text-primary">Today</span> : null}
              </dt>
              <dd className={cn('text-right', ranges.length === 0 && 'text-muted-foreground')}>
                {ranges.length ? ranges.join(', ') : 'Closed'}
              </dd>
            </div>
          )
        })}
      </dl>
      {upcomingClosures.length ? (
        <ul className="space-y-2" aria-label="Upcoming closures">
          {upcomingClosures.map((closure) => (
            <li key={closure.id} className="flex gap-2 rounded-xl bg-muted/70 p-3 text-sm">
              <CalendarOffIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="font-medium">
                  Closed {dayLabel(closure.startDate)}
                  {closure.endDate !== closure.startDate ? ` – ${dayLabel(closure.endDate)}` : ''}
                </span>
                {closure.reason ? <span className="text-muted-foreground"> · {closure.reason}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
