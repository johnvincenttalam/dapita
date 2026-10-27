import { Link } from 'react-router'

import { cn } from '@/lib/utils'

export interface ChipNavItem {
  label: string
  to: string
  active: boolean
}

interface ChipNavProps {
  /** Accessible name of the navigation region, e.g. "Spa & Massage types". */
  label: string
  items: ChipNavItem[]
  className?: string
}

/**
 * Pill links that switch a listing between views, e.g. sub-categories (design
 * screens 4, 9, 10). Scrolls sideways on phones and wraps from `md` up.
 */
export function ChipNav({ label, items, className }: ChipNavProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="-mx-4 flex scroll-px-4 [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {items.map((item) => (
          <li key={item.to} className="shrink-0">
            <Link
              to={item.to}
              replace
              aria-current={item.active ? 'true' : undefined}
              className={cn(
                'inline-flex h-9 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                item.active
                  ? 'bg-primary text-primary-foreground ring-primary'
                  : 'bg-card text-foreground ring-border hover:bg-muted',
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
