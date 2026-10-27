import { CalendarIcon, ClockIcon, MapPinIcon, UserRoundIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Separator } from '@/components/ui/separator'
import { market } from '@/config/market'
import { zonedDateTime } from '@/lib/datetime'
import { formatDuration, formatFullDate, formatPrice, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ServicePrice } from '@/types/business'

function SummaryRow({ icon: Icon, children }: { icon: typeof CalendarIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

/** Where and when, as on design screens 7 and 11. */
export function AppointmentFacts({
  start,
  dateKey,
  staffName,
  areaName,
  durationMinutes,
  className,
}: {
  start?: string
  /** The chosen day while no time is picked yet. */
  dateKey?: string
  staffName?: string
  areaName: string
  durationMinutes?: number
  className?: string
}) {
  return (
    <ul className={cn('space-y-2.5', className)}>
      <SummaryRow icon={CalendarIcon}>
        {start ? formatFullDate(start) : dateKey ? formatFullDate(zonedDateTime(dateKey, '12:00')) : 'Choose a date'}
      </SummaryRow>
      <SummaryRow icon={ClockIcon}>
        {start ? formatTime(start) : 'Choose a time'}
        {durationMinutes ? <span className="text-muted-foreground"> · {formatDuration(durationMinutes)}</span> : null}
      </SummaryRow>
      {staffName ? <SummaryRow icon={UserRoundIcon}>With {staffName}</SummaryRow> : null}
      <SummaryRow icon={MapPinIcon}>
        {areaName}, {market.city}
      </SummaryRow>
    </ul>
  )
}

interface PriceBreakdownProps {
  serviceName: string
  price: ServicePrice
  /** The shop's deposit policy text, if it has one. Never computed (doc §2.4: no deposits in the first release). */
  deposit?: string
  className?: string
}

/**
 * Price summary built only from documented rules: the listed service price,
 * no customer booking fee (doc §8.1) and no in-app payment (doc §5.4, plan C9).
 * Variable prices stay estimates until the shop confirms them.
 */
export function PriceBreakdown({ serviceName, price, deposit, className }: PriceBreakdownProps) {
  const isFinal = price.type === 'fixed'

  return (
    <div className={cn('space-y-3 text-sm', className)}>
      <dl className="space-y-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{serviceName}</dt>
          <dd className="text-right font-medium">{formatPrice(price)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Booking fee</dt>
          <dd className="text-right font-medium">Free</dd>
        </div>
        <Separator />
        <div className="flex justify-between gap-4 text-base">
          <dt className="font-semibold">{isFinal ? 'Total' : 'Estimated total'}</dt>
          <dd className="text-right font-semibold">{formatPrice(price)}</dd>
        </div>
      </dl>
      {deposit ? (
        <p className="rounded-lg bg-muted/70 p-3 text-xs text-pretty">
          <span className="font-semibold">Deposit: </span>
          {deposit}
        </p>
      ) : null}
      <p className="text-xs text-pretty text-muted-foreground">
        {isFinal ? 'Listed price, saved with your request.' : 'The shop confirms the final price.'} No payment is taken
        in the app.
      </p>
    </div>
  )
}
