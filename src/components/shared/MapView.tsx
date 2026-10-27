import 'leaflet/dist/leaflet.css'

import { divIcon } from 'leaflet'
import { MapContainer, Marker, TileLayer, Tooltip } from 'react-leaflet'

import { cn } from '@/lib/utils'
import type { Coordinates } from '@/types/common'

export interface MapPin {
  id: string
  position: Coordinates
  /** Shown on hover/focus and read by screen readers. */
  label: string
}

interface MapViewProps {
  center: Coordinates
  pins: MapPin[]
  zoom?: number
  /** Names the map region, e.g. "Map showing The Good Cut Barbershop". */
  label: string
  className?: string
}

/* OpenStreetMap tiles: free and keyless (plan Q3 default). Their usage policy requires the
   attribution below; swap the URL here if the project moves to a paid tile provider. */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/* An inline SVG pin in the brand pink, so no marker images need bundling (Leaflet's default
   icon paths break under Vite). The anchor sits on the pin's tip. */
const pinIcon = divIcon({
  className: 'text-brand-accent drop-shadow-md',
  html: '<svg viewBox="0 0 24 32" width="32" height="42" aria-hidden="true"><path fill="currentColor" stroke="white" stroke-width="1.5" d="M12 1C6 1 1.5 5.5 1.5 11.3 1.5 19 12 31 12 31s10.5-12 10.5-19.7C22.5 5.5 18 1 12 1Z"/><circle cx="12" cy="11.5" r="4" fill="white"/></svg>',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  tooltipAnchor: [0, -40],
})

/**
 * Interactive map behind a provider-neutral API (plan §5 `MapView` adapter): callers pass
 * coordinates and pins, and only this file knows about Leaflet. Load it with `lazy()` so
 * Leaflet stays out of the main bundle.
 */
export default function MapView({ center, pins, zoom = 16, label, className }: MapViewProps) {
  return (
    // `isolate` keeps Leaflet's high z-index panes below the sticky navbar and sheets.
    <div role="region" aria-label={label} className={cn('isolate overflow-hidden rounded-2xl border', className)}>
      <MapContainer
        center={center}
        zoom={zoom}
        // Page scrolling shouldn't zoom the map; buttons, pinch and keyboard still do.
        scrollWheelZoom={false}
        className="map-view size-full bg-muted"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {pins.map((pin) => (
          <Marker key={pin.id} position={pin.position} icon={pinIcon} title={pin.label} alt={pin.label}>
            <Tooltip direction="top">{pin.label}</Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
