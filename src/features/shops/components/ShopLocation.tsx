import { ExternalLinkIcon, MapPinIcon } from 'lucide-react'
import { lazy, Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { directionsHref } from '@/features/shops/links'
import type { ShopDetails } from '@/types/business'

const MapView = lazy(() => import('@/components/shared/MapView'))

// Wide on desktop so the map frames the pin without pushing policies far below the fold.
const mapClass = 'aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]'

/** Address, a live map when the shop has coordinates, and a directions link. */
export function ShopLocation({ shop }: { shop: Pick<ShopDetails, 'address' | 'coordinates' | 'name'> }) {
  const destination = shop.coordinates
    ? `${shop.coordinates.lat},${shop.coordinates.lng}`
    : `${shop.name}, ${shop.address}`

  return (
    <div className="space-y-3">
      {shop.coordinates && (
        <Suspense fallback={<Skeleton className={`${mapClass} rounded-2xl`} />}>
          <MapView
            center={shop.coordinates}
            pins={[{ id: 'shop', position: shop.coordinates, label: shop.name }]}
            label={`Map showing ${shop.name}`}
            className={mapClass}
          />
        </Suspense>
      )}
      <p className="flex items-start gap-2 text-sm">
        <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>{shop.address}</span>
      </p>
      <Button asChild variant="outline" shape="pill" size="sm">
        <a href={directionsHref(destination)} target="_blank" rel="noopener noreferrer">
          Get directions
          <ExternalLinkIcon aria-hidden="true" />
          <span className="sr-only"> (opens Google Maps in a new tab)</span>
        </a>
      </Button>
    </div>
  )
}
