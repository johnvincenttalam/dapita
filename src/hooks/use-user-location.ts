import { create } from 'zustand'

import type { Coordinates } from '@/types/common'

export type LocationStatus = 'idle' | 'locating' | 'found' | 'denied' | 'unavailable'

interface LocationState {
  status: LocationStatus
  position?: Coordinates
  locate: () => void
}

/**
 * The viewer's position, asked for only when they choose "Use my location" (plan step 10).
 * Kept in memory for this visit: never stored or sent to the server, so a reload asks again.
 */
export const useUserLocation = create<LocationState>()((set) => ({
  status: 'idle',
  locate: () => {
    if (!('geolocation' in navigator)) {
      set({ status: 'unavailable' })
      return
    }
    set({ status: 'locating' })
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => set({ status: 'found', position: { lat: coords.latitude, lng: coords.longitude } }),
      (error) => set({ status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    )
  },
}))
