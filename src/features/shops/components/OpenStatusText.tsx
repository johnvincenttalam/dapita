import { ClockIcon } from 'lucide-react'

import { useNow } from '@/hooks/use-now'
import { describeOpenStatus, getOpenStatus, hasOpeningHours } from '@/lib/opening-hours'
import { cn } from '@/lib/utils'
import type { ClosurePeriod, WeeklyHours } from '@/types/business'

interface OpenStatusTextProps {
  hours: WeeklyHours
  closures: ClosurePeriod[]
  withIcon?: boolean
  className?: string
}

/** "Open · Closes 9:00 PM" in Davao City time (design screens 4–5). Refreshes every minute. */
export function OpenStatusText({ hours, closures, withIcon, className }: OpenStatusTextProps) {
  const now = useNow()

  if (!hasOpeningHours(hours)) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Opening hours not provided</p>
  }

  const status = getOpenStatus(hours, closures, now)
  const { label, detail } = describeOpenStatus(status, now)
  return (
    <p className={cn('flex flex-wrap items-center gap-x-1.5 text-sm', className)}>
      {withIcon ? <ClockIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : null}
      {/* The separator stays with the label, so a narrow card wraps to "Closed ·" / "Opens tomorrow…". */}
      <span className="whitespace-nowrap">
        <span className={cn('font-semibold', status.isOpen ? 'text-success-emphasis' : 'text-muted-foreground')}>
          {label}
        </span>
        {detail ? (
          <>
            <span aria-hidden="true" className="text-muted-foreground">
              {' '}
              ·
            </span>
            <span className="sr-only">, </span>
          </>
        ) : null}
      </span>
      {detail ? <span className="whitespace-nowrap text-muted-foreground">{detail}</span> : null}
    </p>
  )
}
