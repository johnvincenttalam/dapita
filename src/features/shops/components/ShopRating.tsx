import { StarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { RatingSummary } from '@/types/business'

interface ShopRatingProps {
  rating?: RatingSummary
  /** `compact`: "4.8 (120)" on cards. `full`: "4.8 (120 reviews)" on the profile. */
  variant?: 'compact' | 'full'
  className?: string
}

/**
 * Star rating from real reviews only. Reviews are P1, and the documentation
 * forbids inventing ratings (doc §9.3, plan C3), so shops without reviews say so.
 */
export function ShopRating({ rating, variant = 'compact', className }: ShopRatingProps) {
  if (!rating || rating.count === 0) {
    return <p className={cn('text-xs text-muted-foreground', className)}>No reviews yet</p>
  }

  const count = variant === 'full' ? `${rating.count} ${rating.count === 1 ? 'review' : 'reviews'}` : rating.count
  return (
    <p className={cn('flex items-center gap-1 text-sm', className)}>
      <StarIcon aria-hidden="true" className="size-4 fill-rating text-rating" />
      <span className="font-semibold">{rating.average.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
      <span className="sr-only">average rating</span>
    </p>
  )
}
