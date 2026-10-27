import type { Key, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface HorizontalScrollerProps<T> {
  items: readonly T[]
  getKey: (item: T) => Key
  renderItem: (item: T) => ReactNode
  /** Accessible name for the list. */
  label: string
  /** Width of each item while scrolling sideways on phones. */
  itemClassName?: string
  className?: string
}

/**
 * A row of cards that scrolls sideways with snap points on phones (design
 * screen 3, "Popular Near You") and becomes a regular grid from `md` up.
 */
export function HorizontalScroller<T>({
  items,
  getKey,
  renderItem,
  label,
  itemClassName = 'w-44',
  className,
}: HorizontalScrollerProps<T>) {
  return (
    <ul
      aria-label={label}
      className={cn(
        // scroll-px keeps the first card inside the page gutter when snapping.
        '-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6',
        'md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <li key={getKey(item)} className={cn('shrink-0 snap-start md:w-auto', itemClassName)}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  )
}
