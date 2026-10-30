import 'leaflet/dist/leaflet.css'

import { divIcon, latLngBounds } from 'leaflet'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'

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
  /** The highlighted pin. The map pans to it when it changes. */
  selectedId?: string
  /** Makes pins selectable by click, tap or Enter. */
  onSelect?: (id: string) => void
  /** Frames every pin whenever the set of pins changes, instead of using `center` and `zoom`. */
  fitPins?: boolean
  /** The viewer's position, drawn as a dot. The map centres on it when it first arrives. */
  userPosition?: Coordinates
  /** Lets the mouse wheel zoom. Off by default, so scrolling a page doesn't zoom a map in it. */
  scrollWheelZoom?: boolean
  /** Overlays inside the map frame, e.g. a selected-shop card or a locate button. */
  children?: ReactNode
}

/* OpenStreetMap tiles: free and keyless (plan Q3 default). Their usage policy requires the
   attribution below; swap the URL here if the project moves to a paid tile provider. */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/* An inline SVG pin, so no marker images need bundling (Leaflet's default icon paths break
   under Vite). The anchor sits on the pin's tip. The selected pin is larger and green. */
const pinSvg = (width: number) =>
  `<svg viewBox="0 0 24 32" width="${width}" height="${Math.round((width * 42) / 32)}" aria-hidden="true"><path fill="currentColor" stroke="white" stroke-width="1.5" d="M12 1C6 1 1.5 5.5 1.5 11.3 1.5 19 12 31 12 31s10.5-12 10.5-19.7C22.5 5.5 18 1 12 1Z"/><circle cx="12" cy="11.5" r="4" fill="white"/></svg>`

const pinIcon = divIcon({
  className: 'text-brand-accent drop-shadow-md',
  html: pinSvg(32),
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  tooltipAnchor: [0, -40],
})

const selectedPinIcon = divIcon({
  className: 'text-primary drop-shadow-lg',
  html: pinSvg(40),
  iconSize: [40, 53],
  iconAnchor: [20, 53],
  tooltipAnchor: [0, -50],
})

/** Moves the map when the pins, the selection or the viewer's position change. */
function Camera({
  pins,
  fitPins,
  selected,
  userPosition,
}: {
  pins: MapPin[]
  fitPins: boolean
  selected?: Coordinates
  userPosition?: Coordinates
}) {
  const map = useMap()
  // A key that changes only when the set of pins does, not on every render.
  const pinKey = pins.map((pin) => pin.id).join(',')

  useEffect(() => {
    if (!fitPins || !pins.length) return
    map.fitBounds(latLngBounds(pins.map((pin) => [pin.position.lat, pin.position.lng])), {
      padding: [48, 48],
      maxZoom: 16,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the set of pins changes
  }, [map, fitPins, pinKey])

  useEffect(() => {
    if (selected && !map.getBounds().pad(-0.1).contains(selected)) map.panTo(selected)
  }, [map, selected])

  // A position remembered from an earlier visit is already there on mount; when there are pins
  // to fit, they win, so a filtered map isn't pulled back to where the viewer once was.
  const positionAtMount = useRef(userPosition)
  const hasUser = Boolean(userPosition)
  useEffect(() => {
    if (!userPosition) return
    if (fitPins && pins.length && userPosition === positionAtMount.current) return
    map.setView(userPosition, Math.max(map.getZoom(), 14))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- centre once, when the position first arrives
  }, [map, hasUser])

  return null
}

/**
 * Interactive map behind a provider-neutral API (plan §5 `MapView` adapter): callers pass
 * coordinates and pins, and only this file knows about Leaflet. Load it with `lazy()` so
 * Leaflet stays out of the main bundle.
 */
export default function MapView({
  center,
  pins,
  zoom = 16,
  label,
  className,
  selectedId,
  onSelect,
  fitPins = false,
  userPosition,
  scrollWheelZoom = false,
  children,
}: MapViewProps) {
  const selected = useMemo(() => pins.find((pin) => pin.id === selectedId)?.position, [pins, selectedId])

  return (
    // `isolate` keeps Leaflet's high z-index panes below the sticky navbar and sheets.
    <div
      role="region"
      aria-label={label}
      className={cn('relative isolate overflow-hidden rounded-2xl border', className)}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        className="map-view size-full bg-muted"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Camera pins={pins} fitPins={fitPins} selected={selected} userPosition={userPosition} />
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={pin.position}
            icon={pin.id === selectedId ? selectedPinIcon : pinIcon}
            zIndexOffset={pin.id === selectedId ? 1000 : 0}
            title={pin.label}
            alt={pin.label}
            keyboard={Boolean(onSelect)}
            eventHandlers={onSelect ? { click: () => onSelect(pin.id) } : undefined}
          >
            <Tooltip direction="top">{pin.label}</Tooltip>
          </Marker>
        ))}
        {userPosition ? (
          <CircleMarker
            center={userPosition}
            radius={8}
            pathOptions={{ color: 'white', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
          >
            <Tooltip direction="top">You are here</Tooltip>
          </CircleMarker>
        ) : null}
      </MapContainer>
      {children}
    </div>
  )
}
