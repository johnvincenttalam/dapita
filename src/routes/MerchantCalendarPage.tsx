import { ChevronLeftIcon, ChevronRightIcon, InfoIcon } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useBusinessBookingsQuery,
  useCurrentBusinessId,
  useRefetchAtNextExpiry,
} from '@/features/booking/api/merchant-queries'
import { useBusinessProfileQuery } from '@/features/merchant/api/business-queries'
import { entryStyles } from '@/features/merchant/components/calendar/entry-styles'
import { DaySchedule } from '@/features/merchant/components/calendar/DaySchedule'
import { WeekSchedule } from '@/features/merchant/components/calendar/WeekSchedule'
import { useShopStaffQuery } from '@/features/shops/api/queries'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { addDays, toDateKey, zonedDateTime } from '@/lib/datetime'
import { formatLongDate } from '@/lib/format'
import {
  calendarEntries,
  dayWindow,
  parseCalendarParams,
  scheduleColumns,
  weekOf,
  type CalendarView,
  type EntryKind,
} from '@/lib/merchant-calendar'
import { cn } from '@/lib/utils'
import type { DateKey } from '@/types/common'

const monthDay = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric' })
const dayOnly = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', day: 'numeric' })

/** "October 19 – 25", or "October 26 – November 1" across months. */
function formatWeekRange(days: DateKey[]) {
  const first = zonedDateTime(days[0] ?? '', '12:00')
  const last = zonedDateTime(days.at(-1) ?? '', '12:00')
  const sameMonth = first.getUTCMonth() === last.getUTCMonth()
  return `${monthDay.format(first)} – ${sameMonth ? dayOnly.format(last) : monthDay.format(last)}`
}

const legend: { kind: EntryKind; text: string }[] = [
  { kind: 'confirmed', text: 'Confirmed' },
  { kind: 'request', text: 'Request' },
  { kind: 'proposed', text: 'New time proposed' },
]

/** Calendar (§9.2): the day by staff member, or the week at a glance. Read-only; answers happen on Bookings. */
export default function MerchantCalendarPage() {
  useDocumentTitle('Calendar')
  const now = useNow()
  const today = toDateKey(now)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { view, date } = parseCalendarParams(searchParams, today)

  const businessId = useCurrentBusinessId()
  const bookings = useBusinessBookingsQuery(businessId)
  useRefetchAtNextExpiry(bookings.data, bookings.refetch)
  const profile = useBusinessProfileQuery(businessId)
  const business = profile.data?.business
  const staff = useShopStaffQuery(business?.slug ?? '')

  const days = view === 'week' ? weekOf(date) : [date]
  const entries = calendarEntries(bookings.data ?? [], days[0] ?? date, days.at(-1) ?? date, now)

  const go = (next: { view?: CalendarView; date?: DateKey }) => {
    const params = new URLSearchParams()
    const nextView = next.view ?? view
    const nextDate = next.date ?? date
    if (nextView === 'week') params.set('view', 'week')
    if (nextDate !== today) params.set('date', nextDate)
    const query = params.toString()
    void navigate(query ? `/business/calendar?${query}` : '/business/calendar', { replace: true })
  }
  const step = view === 'week' ? 7 : 1
  const unit = view === 'week' ? 'week' : 'day'
  const title = view === 'week' ? formatWeekRange(days) : formatLongDate(zonedDateTime(date, '12:00'))
  const isCurrent = view === 'week' ? days.includes(today) : date === today

  const loading = bookings.isPending || profile.isPending || (Boolean(business) && staff.isPending)
  const error = bookings.error ?? profile.error
  const window = business ? dayWindow(business.hours, business.closures, date, entries) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Confirmed appointments and the requests still waiting, by day or week."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" shape="pill" size="sm" disabled={isCurrent} onClick={() => go({ date: today })}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Previous ${unit}`}
            onClick={() => go({ date: addDays(date, -step) })}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Next ${unit}`}
            onClick={() => go({ date: addDays(date, step) })}
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
          <h2 className="ml-1 type-heading" aria-live="polite">
            {title}
          </h2>
        </div>
        <div className="flex gap-1 self-start rounded-full bg-muted p-1 sm:self-auto">
          {(['day', 'week'] as const).map((option) => (
            <Button
              key={option}
              variant={view === option ? 'default' : 'ghost'}
              shape="pill"
              size="sm"
              aria-pressed={view === option}
              onClick={() => go({ view: option })}
            >
              {option === 'day' ? 'Day' : 'Week'}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void Promise.all([bookings.refetch(), profile.refetch()])} />
      ) : loading || !business || !window ? (
        <Skeleton aria-hidden="true" className="h-[32rem] rounded-3xl" />
      ) : (
        <>
          {view === 'day' && window.closed ? (
            <Alert variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                {window.closed === 'closure'
                  ? `Closed${window.closure?.reason ? `: ${window.closure.reason}` : ' this day'}`
                  : 'Closed on this day of the week'}
                {entries.length ? '. Some appointments still fall on this day.' : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {view === 'day' ? (
            <DaySchedule date={date} window={window} columns={scheduleColumns(entries, staff.data ?? [])} now={now} />
          ) : (
            <WeekSchedule
              days={days}
              entries={entries}
              hours={business.hours}
              closures={business.closures}
              now={now}
              dayHref={(day) => (day === today ? '/business/calendar' : `/business/calendar?date=${day}`)}
            />
          )}
          <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {legend.map((item) => (
              <li key={item.kind} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-3 rounded', entryStyles[item.kind].className)} />
                {item.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
