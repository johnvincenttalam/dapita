import { LocateFixedIcon, XIcon } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { market } from '@/config/market'
import { ShopListItem } from '@/features/discovery/components/ShopListItem'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useUserLocation } from '@/hooks/use-user-location'
import { distanceKm } from '@/lib/geo'
import { cn } from '@/lib/utils'
import type { ShopSummary } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

const MapView = lazy(() => import('@/components/shared/MapView'))

// Phones: fits between the search row and the bottom tab bar. Desktop: fills the screen below the header.
const frameClass = 'h-[calc(100dvh-22rem)] min-h-80 md:h-[60dvh] lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)]'

const locationMessages = {
  denied: 'Location is turned off for this site, so we can’t show what’s near you. Choose an area in Filters instead.',
  unavailable: 'We couldn’t find your location just now. Try again, or choose an area in Filters.',
} as const

interface ExploreMapProps {
  shops: ShopSummary[]
  categoryById: Map<string, ServiceCategory>
}

/**
 * The map view of the search results (design screen 4): a pin per shop and the
 * selected shop's card. From `lg` the results list sits beside the map; choosing
 * a pin or a row highlights the other. "Use my location" adds distances and puts
 * the nearest shops first.
 */
export function ExploreMap({ shops, categoryById }: ExploreMapProps) {
  const location = useUserLocation()
  const wide = useMediaQuery('(min-width: 64rem)')
  const [selectedId, setSelectedId] = useState<string>()
  const listRef = useRef<HTMLUListElement>(null)

  const rows = useMemo(() => {
    const withDistance = shops.map((shop) => ({
      shop,
      distance: location.position && shop.coordinates ? distanceKm(location.position, shop.coordinates) : undefined,
    }))
    return location.position
      ? withDistance.toSorted((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      : withDistance
  }, [shops, location.position])

  const pins = useMemo(
    () =>
      shops.flatMap((shop) =>
        shop.coordinates ? [{ id: shop.id, position: shop.coordinates, label: shop.name }] : [],
      ),
    [shops],
  )
  const unmapped = shops.length - pins.length
  const selected = rows.find((row) => row.shop.id === selectedId)

  // A pin chosen on the map brings its row into view in the list beside it.
  useEffect(() => {
    if (!wide || !selectedId) return
    listRef.current
      ?.querySelector(`[data-shop-id="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId, wide])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
      <ul
        ref={listRef}
        aria-label="Shops on the map"
        className="hidden space-y-3 lg:block lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:p-1"
      >
        {rows.map(({ shop, distance }) => (
          <li
            key={shop.id}
            data-shop-id={shop.id}
            onPointerEnter={() => setSelectedId(shop.id)}
            onFocus={() => setSelectedId(shop.id)}
          >
            <ShopListItem
              shop={shop}
              category={categoryById.get(shop.categoryIds[0] ?? '')}
              distance={distance}
              className={cn(shop.id === selectedId && 'ring-2 ring-primary')}
            />
          </li>
        ))}
      </ul>

      <div className="min-w-0 space-y-2">
        <Suspense fallback={<Skeleton className={cn(frameClass, 'rounded-2xl')} />}>
          <MapView
            center={location.position ?? market.center}
            zoom={13}
            pins={pins}
            fitPins
            selectedId={selectedId}
            onSelect={setSelectedId}
            userPosition={location.position}
            scrollWheelZoom
            label="Map of shops"
            className={frameClass}
          >
            <div className="absolute top-3 right-3 z-1100">
              <Button
                variant="secondary"
                shape="pill"
                size="sm"
                loading={location.status === 'locating'}
                onClick={location.locate}
                className="bg-card shadow-md hover:bg-muted"
              >
                <LocateFixedIcon aria-hidden="true" />
                {location.status === 'found' ? 'Update my location' : 'Use my location'}
              </Button>
            </div>

            {selected && !wide ? (
              <div className="absolute inset-x-3 bottom-7 z-1100">
                <ShopListItem
                  shop={selected.shop}
                  category={categoryById.get(selected.shop.categoryIds[0] ?? '')}
                  distance={selected.distance}
                  className="pr-10 shadow-lg"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close"
                  onClick={() => setSelectedId(undefined)}
                  className="absolute top-2 right-2"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </MapView>
        </Suspense>

        <div aria-live="polite" className="space-y-1 text-sm text-muted-foreground">
          {location.status === 'denied' || location.status === 'unavailable' ? (
            <p>{locationMessages[location.status]}</p>
          ) : null}
          {location.status === 'found' ? <p>Nearest shops first. Your location stays on this device.</p> : null}
          {unmapped > 0 ? (
            <p>
              {unmapped} {unmapped === 1 ? 'shop has' : 'shops have'} no map location yet; switch to the list to see{' '}
              {unmapped === 1 ? 'it' : 'them'}.
            </p>
          ) : null}
          {!wide && pins.length ? <p className="lg:hidden">Tap a pin to see the shop.</p> : null}
        </div>
      </div>
    </div>
  )
}
