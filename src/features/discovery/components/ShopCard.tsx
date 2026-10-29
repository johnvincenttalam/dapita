import { MapPinIcon } from 'lucide-react'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { categoryIcons } from '@/config/category-icons'
import { ShopNameLink } from '@/features/discovery/components/ShopNameLink'
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton'
import { OpenStatusText } from '@/features/shops/components/OpenStatusText'
import { ShopRating } from '@/features/shops/components/ShopRating'
import { formatDistance, formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ShopSummary } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

interface ShopCardProps {
  shop: ShopSummary
  /** The shop's primary category, for the label and placeholder icon. */
  category?: ServiceCategory
  /** `tile`: compact card in a row (design screen 3). `feature`: wide image card in a listing (screen 10). */
  variant?: 'tile' | 'feature'
  headingLevel?: 'h2' | 'h3'
  /** Kilometres from the viewer, when they've set a location. */
  distanceKm?: number
  /** Why the shop is suggested, e.g. "Customers like you". */
  tag?: string
  className?: string
}

/**
 * A shop in a listing. The whole card is clickable through the name link's
 * stretched hit area, so screen readers hear one link named after the shop.
 * Cards show the area, plus the distance once the viewer has set a location (plan C14).
 */
export function ShopCard({
  shop,
  category,
  variant = 'tile',
  headingLevel: Heading = 'h3',
  distanceKm,
  tag,
  className,
}: ShopCardProps) {
  const feature = variant === 'feature'

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl card-surface transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md',
        className,
      )}
    >
      <ImageWithFallback
        src={shop.coverPhoto?.url}
        srcSet={shop.coverPhoto?.srcSet}
        sizes={feature ? '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
        alt=""
        icon={category ? categoryIcons[category.icon] : undefined}
        className={cn('w-full', feature ? 'aspect-video' : 'aspect-4/3')}
      />
      {/* Above the name link's stretched hit area. */}
      <FavoriteButton businessId={shop.id} shopName={shop.name} className="absolute top-2 right-2 z-10" />
      <div className={cn('@container flex flex-1 flex-col gap-1', feature ? 'p-4' : 'p-3')}>
        <Heading className={cn('font-semibold text-pretty', feature ? 'text-base' : 'text-sm leading-snug')}>
          <ShopNameLink shop={shop} />
        </Heading>
        {tag ? (
          <Badge variant="secondary" className="w-fit">
            {tag}
          </Badge>
        ) : null}
        {category ? <p className="text-xs text-muted-foreground">{category.name}</p> : null}
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{shop.area.name}</span>
          {distanceKm === undefined ? null : (
            <>
              <span aria-hidden="true">·</span>
              <span className="shrink-0 tabular-nums">{formatDistance(distanceKm)}</span>
            </>
          )}
        </p>
        {feature ? <OpenStatusText hours={shop.hours} closures={shop.closures} className="text-xs" /> : null}
        {/* Stack by card width, not by text length, so cards in one row match. */}
        <div className="mt-auto flex flex-col gap-1 pt-1 @[11rem]:flex-row @[11rem]:flex-wrap @[11rem]:items-center @[11rem]:justify-between @[11rem]:gap-2">
          <ShopRating rating={shop.rating} />
          {shop.priceFrom !== undefined ? (
            <p className="text-xs text-muted-foreground">
              From <span className="font-semibold text-foreground">{formatPeso(shop.priceFrom)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function ShopCardSkeleton({ variant = 'tile', className }: Pick<ShopCardProps, 'variant' | 'className'>) {
  return (
    <div aria-hidden="true" className={cn('overflow-hidden rounded-2xl card-surface', className)}>
      <Skeleton className={cn('w-full rounded-none', variant === 'feature' ? 'aspect-video' : 'aspect-4/3')} />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
