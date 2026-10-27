import { BadgeCheckIcon, MapPinIcon } from 'lucide-react'

import { market } from '@/config/market'
import { OpenStatusText } from '@/features/shops/components/OpenStatusText'
import { ShopRating } from '@/features/shops/components/ShopRating'
import type { ShopDetails } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

interface ShopHeaderProps {
  shop: ShopDetails
  categories: ServiceCategory[]
}

/** Name, category, rating, location and open status (design screen 5). */
export function ShopHeader({ shop, categories }: ShopHeaderProps) {
  const categoryNames = shop.categoryIds
    .map((id) => categories.find((category) => category.id === id)?.name)
    .filter(Boolean)
    .join(' · ')

  return (
    <header className="space-y-2">
      {categoryNames ? <p className="type-eyebrow text-primary">{categoryNames}</p> : null}
      <h1 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">{shop.name}</h1>
      {shop.verified ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <BadgeCheckIcon aria-hidden="true" className="size-4" />
          Verified business
        </p>
      ) : null}
      <ShopRating rating={shop.rating} variant="full" />
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {shop.area.name}, {market.city}
        </span>
      </p>
      <OpenStatusText hours={shop.hours} closures={shop.closures} withIcon />
    </header>
  )
}
