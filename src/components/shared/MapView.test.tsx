import { render } from '@testing-library/react'
import { Map as LeafletMap } from 'leaflet'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MapView, { type MapPin } from '@/components/shared/MapView'
import type { Coordinates } from '@/types/common'

const pins: MapPin[] = [
  { id: 'a', position: { lat: 7.02, lng: 125.5 }, label: 'Shop A' },
  { id: 'b', position: { lat: 7.03, lng: 125.51 }, label: 'Shop B' },
]
/** A remembered district centre far from the pins. */
const remembered: Coordinates = { lat: 7.0918, lng: 125.6111 }

const centredOn = (spy: { mock: { calls: unknown[][] } }, position: Coordinates) =>
  spy.mock.calls.some(([latLng]) => {
    const { lat, lng } = latLng as Coordinates
    return lat === position.lat && lng === position.lng
  })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MapView camera', () => {
  it('fits the pins on mount instead of jumping to a remembered position', () => {
    const setView = vi.spyOn(LeafletMap.prototype, 'setView')
    render(<MapView center={pins[0]!.position} pins={pins} fitPins userPosition={remembered} label="Map" />)
    expect(centredOn(setView, remembered)).toBe(false)
  })

  it('centres on the viewer when their position arrives while the map is open', () => {
    const setView = vi.spyOn(LeafletMap.prototype, 'setView')
    const { rerender } = render(<MapView center={pins[0]!.position} pins={pins} fitPins label="Map" />)
    rerender(<MapView center={pins[0]!.position} pins={pins} fitPins userPosition={remembered} label="Map" />)
    expect(centredOn(setView, remembered)).toBe(true)
  })

  it('centres on the viewer on mount when there are no pins to fit', () => {
    const setView = vi.spyOn(LeafletMap.prototype, 'setView')
    render(<MapView center={pins[0]!.position} pins={[]} fitPins userPosition={remembered} label="Map" />)
    expect(centredOn(setView, remembered)).toBe(true)
  })
})
