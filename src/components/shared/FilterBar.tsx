import { FilterXIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FilterBarProps {
  /** Search inputs, selects, date pickers… */
  children: ReactNode
  /** Number of filters currently applied. The reset button shows when > 0. */
  activeCount?: number
  onReset?: () => void
  /** Right-aligned content such as a result count or view options. */
  end?: ReactNode
  /** Accessible name of the filter region. */
  label?: string
  className?: string
}

export function FilterBar({ children, activeCount = 0, onReset, end, label = 'Filters', className }: FilterBarProps) {
  return (
    <div
      role="search"
      aria-label={label}
      className={cn('flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between', className)}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
        {onReset && activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <FilterXIcon aria-hidden="true" />
            Reset filters
            <span className="sr-only"> ({activeCount} active)</span>
          </Button>
        ) : null}
      </div>
      {end ? <div className="flex items-center gap-2 text-sm text-muted-foreground">{end}</div> : null}
    </div>
  )
}
