import { MapPinIcon } from 'lucide-react'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { Skeleton } from '@/components/ui/skeleton'
import { categoryIcons } from '@/config/category-icons'
import { ShopNameLink } from '@/features/discovery/components/ShopNameLink'
import { OpenStatusText } from '@/features/shops/components/OpenStatusText'
import { ShopRating } from '@/features/shops/components/ShopRating'
import { formatDistance, formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ShopSummary } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

interface ShopListItemProps {
  shop: ShopSummary
  category?: ServiceCategory
  /** Kilometres from the viewer, once they've shared their location. */
  distance?: number
  className?: string
}

/** A search result row, modelled on the shop card in the map view (design screen 4). */
export function ShopListItem({ shop, category, distance, className }: ShopListItemProps) {
  return (
    <article
      className={cn(
        'group relative flex gap-3 rounded-2xl card-surface p-3 transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md sm:gap-4',
        className,
      )}
    >
      <ImageWithFallback
        src={shop.coverPhoto?.url}
        srcSet={shop.coverPhoto?.srcSet}
        sizes="112px"
        alt=""
        icon={category ? categoryIcons[category.icon] : undefined}
        className="size-24 shrink-0 rounded-xl sm:size-28"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="font-semibold text-pretty">
          <ShopNameLink shop={shop} />
        </h2>
        <ShopRating rating={shop.rating} />
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">
            {category ? `${category.name} · ` : ''}
            {shop.area.name}
            {distance !== undefined ? ` · ${formatDistance(distance)}` : ''}
          </span>
        </p>
        <OpenStatusText hours={shop.hours} closures={shop.closures} />
        {shop.priceFrom !== undefined ? (
          <p className="text-sm text-muted-foreground">
            From <span className="font-semibold text-foreground">{formatPeso(shop.priceFrom)}</span>
          </p>
        ) : null}
      </div>
    </article>
  )
}

export function ShopListItemSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-3 rounded-2xl card-surface p-3 sm:gap-4">
      <Skeleton className="size-24 shrink-0 rounded-xl sm:size-28" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
