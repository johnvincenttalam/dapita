import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Area } from '@/types/catalog'
import type { Coordinates } from '@/types/common'

export type LocationStatus = 'idle' | 'locating' | 'found' | 'denied' | 'unavailable'
export type LocationSource = 'device' | 'area'

export const LOCATION_STORAGE_KEY = 'dapita-location'

interface LocationState {
  status: LocationStatus
  position?: Coordinates
  source?: LocationSource
  /** Set when the customer picked a district instead of sharing their location. */
  area?: Pick<Area, 'id' | 'name'>
  locate: () => void
  chooseArea: (area: Area) => void
  /** Forgets the location, here and in storage. */
  clear: () => void
}

type StoredLocation = Pick<LocationState, 'position' | 'source' | 'area'>

const isCoordinates = (value: unknown): value is Coordinates =>
  typeof value === 'object' &&
  value !== null &&
  Number.isFinite((value as Coordinates).lat) &&
  Number.isFinite((value as Coordinates).lng)

/**
 * The viewer's position: their device location (asked for only when they choose "Use my
 * location", plan step 10) or the centre of a district they picked. Remembered on this
 * device so suggestions stay local on the next visit; never sent to the server.
 */
export const useUserLocation = create<LocationState>()(
  persist(
    (set) => ({
      status: 'idle',
      locate: () => {
        if (!('geolocation' in navigator)) {
          set({ status: 'unavailable' })
          return
        }
        set({ status: 'locating' })
        navigator.geolocation.getCurrentPosition(
          ({ coords }) =>
            set({
              status: 'found',
              position: { lat: coords.latitude, lng: coords.longitude },
              source: 'device',
              area: undefined,
            }),
          (error) => set({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
        )
      },
      chooseArea: (area) =>
        set({ status: 'found', position: area.center, source: 'area', area: { id: area.id, name: area.name } }),
      clear: () => set({ status: 'idle', position: undefined, source: undefined, area: undefined }),
    }),
    {
      name: LOCATION_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ position, source, area }): StoredLocation => ({ position, source, area }),
      // Anything unreadable in storage counts as no location, so the page asks again.
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as StoredLocation
        if (!isCoordinates(stored.position)) return current
        return {
          ...current,
          status: 'found',
          position: stored.position,
          source: stored.source === 'area' ? 'area' : 'device',
          area: stored.source === 'area' && stored.area ? stored.area : undefined,
        }
      },
    },
  ),
)
