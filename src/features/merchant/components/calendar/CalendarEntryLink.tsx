import type { CSSProperties } from 'react'
import { Link } from 'react-router'

import { formatTimeSpan, getMerchantTab, merchantBookingHref } from '@/lib/merchant-bookings'
import { entryStyles } from '@/features/merchant/components/calendar/entry-styles'
import type { CalendarEntry, EntryKind } from '@/lib/merchant-calendar'
import { cn } from '@/lib/utils'

const kindNote: Partial<Record<EntryKind, string>> = { request: 'Request', proposed: 'New time proposed' }

interface CalendarEntryLinkProps {
  entry: CalendarEntry
  now: Date
  /** `block`: sized by the day grid. `row`: one line in the week list. */
  variant: 'block' | 'row'
  style?: CSSProperties
  className?: string
}

/** One appointment; opens the booking where it can be answered or checked. */
export function CalendarEntryLink({ entry, now, variant, style, className }: CalendarEntryLinkProps) {
  const { booking, kind } = entry
  const span = formatTimeSpan(entry.start, entry.end)
  const label = `${span}, ${booking.contact.name}, ${booking.service.name}, ${entryStyles[kind].label}`
  const note = kindNote[kind]

  return (
    <Link
      to={merchantBookingHref(booking.id, getMerchantTab(booking, now))}
      aria-label={label}
      style={style}
      className={cn(
        'block min-w-0 overflow-hidden rounded-lg text-left transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
        entryStyles[kind].className,
        variant === 'block' ? 'px-2 py-1' : 'px-2.5 py-2',
        className,
      )}
    >
      <span className="block truncate text-xs tabular-nums opacity-80">{span}</span>
      <span className={cn('block truncate text-sm', kind !== 'done' && 'font-semibold')}>{booking.contact.name}</span>
      <span className="block truncate text-xs opacity-80">
        {note ? `${note} · ` : null}
        {booking.service.name}
        {variant === 'row' ? ` · ${booking.staffName ?? 'Any staff'}` : null}
      </span>
    </Link>
  )
}
