import { useId } from 'react'

import { CalendarEntryLink } from '@/features/merchant/components/calendar/CalendarEntryLink'
import { minutesIntoDay, toDateKey, toTimeOfDay } from '@/lib/datetime'
import { assignLanes, type CalendarEntry, type DayWindow, type ScheduleColumn } from '@/lib/merchant-calendar'
import { formatTimeOfDay } from '@/lib/opening-hours'
import type { DateKey } from '@/types/common'

/** One hour of the grid, in px. Half an hour is the smallest appointment that stays legible. */
const HOUR_PX = 72
const MIN_BLOCK_PX = 40

interface DayScheduleProps {
  date: DateKey
  window: DayWindow
  columns: ScheduleColumn[]
  now: Date
}

function Column({ column, window, now }: { column: ScheduleColumn; window: DayWindow; now: Date }) {
  const id = useId()
  const top = (iso: string) => ((minutesIntoDay(new Date(iso)) - window.startMinutes) / 60) * HOUR_PX
  const placed = assignLanes(column.entries)

  return (
    <section aria-labelledby={id} className="min-w-36 flex-1 border-l border-border/70">
      <h3
        id={id}
        className="sticky top-0 z-10 h-10 truncate border-b border-border/70 bg-card px-2 leading-10 font-medium"
      >
        {column.title}
      </h3>
      <div className="relative" style={{ height: ((window.endMinutes - window.startMinutes) / 60) * HOUR_PX }}>
        {placed.map((entry: CalendarEntry & { lane: number; lanes: number }) => {
          const y = top(entry.start)
          const height = Math.max(
            MIN_BLOCK_PX,
            top(entry.end) - y || (entry.booking.service.durationMinutes / 60) * HOUR_PX,
          )
          return (
            <CalendarEntryLink
              key={entry.booking.id}
              entry={entry}
              now={now}
              variant="block"
              className="absolute z-10"
              style={{
                top: y + 1,
                height: height - 2,
                left: `calc(${(entry.lane / entry.lanes) * 100}% + 2px)`,
                width: `calc(${100 / entry.lanes}% - 4px)`,
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

/** The day as a time grid with a column per staff member; scrolls sideways on phones. */
export function DaySchedule({ date, window, columns, now }: DayScheduleProps) {
  const hours: number[] = []
  for (let minutes = window.startMinutes; minutes < window.endMinutes; minutes += 60) hours.push(minutes)
  const isToday = toDateKey(now) === date
  const nowMinutes = minutesIntoDay(now)
  const showNow = isToday && nowMinutes >= window.startMinutes && nowMinutes <= window.endMinutes

  return (
    <div className="overflow-x-auto rounded-3xl card-surface">
      <div className="relative flex min-w-fit">
        <div aria-hidden="true" className="w-16 shrink-0 pt-10">
          {hours.map((minutes) => (
            <div key={minutes} className="relative text-right" style={{ height: HOUR_PX }}>
              <span className="absolute -top-2 right-2 text-xs text-muted-foreground tabular-nums">
                {formatTimeOfDay(toTimeOfDay(minutes))}
              </span>
            </div>
          ))}
        </div>
        <div className="relative flex flex-1">
          {/* Hour lines behind the columns. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-10 bottom-0">
            {hours.map((minutes) => (
              <div key={minutes} className="border-t border-border/50" style={{ height: HOUR_PX }} />
            ))}
          </div>
          {columns.map((column) => (
            <Column key={column.id} column={column} window={window} now={now} />
          ))}
          {showNow ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-[5] border-t-2 border-primary"
              style={{ top: 40 + ((nowMinutes - window.startMinutes) / 60) * HOUR_PX }}
            >
              <span className="absolute -top-1.5 -left-1 size-2.5 rounded-full bg-primary" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
