import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LOCATION_STORAGE_KEY, useUserLocation } from '@/hooks/use-user-location'
import type { Area } from '@/types/catalog'

const bajada: Area = { id: 'area_bajada', slug: 'bajada', name: 'Bajada', center: { lat: 7.0927, lng: 125.6117 } }

beforeEach(() => {
  localStorage.clear()
  useUserLocation.getState().clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useUserLocation', () => {
  it('chooseArea sets the area centre and status found', () => {
    useUserLocation.getState().chooseArea(bajada)
    expect(useUserLocation.getState()).toMatchObject({
      status: 'found',
      position: bajada.center,
      source: 'area',
      area: { id: 'area_bajada', name: 'Bajada' },
    })
  })

  it('a stored location is restored on load', async () => {
    localStorage.setItem(
      LOCATION_STORAGE_KEY,
      JSON.stringify({ state: { position: { lat: 7.1, lng: 125.6 }, source: 'device' }, version: 0 }),
    )
    await useUserLocation.persist.rehydrate()
    expect(useUserLocation.getState()).toMatchObject({ status: 'found', position: { lat: 7.1, lng: 125.6 } })
  })

  it('clear forgets it', () => {
    useUserLocation.getState().chooseArea(bajada)
    useUserLocation.getState().clear()
    expect(useUserLocation.getState()).toMatchObject({ status: 'idle', position: undefined, area: undefined })
    expect(localStorage.getItem(LOCATION_STORAGE_KEY) ?? '').not.toContain('lat')
  })

  it('ignores a corrupt stored location', async () => {
    localStorage.setItem(LOCATION_STORAGE_KEY, '{not json')
    await useUserLocation.persist.rehydrate()
    expect(useUserLocation.getState().status).toBe('idle')

    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ state: { position: { lng: 125.6 } }, version: 0 }))
    await useUserLocation.persist.rehydrate()
    expect(useUserLocation.getState()).toMatchObject({ status: 'idle', position: undefined })
  })

  it('a denied device location still lets you choose an area', () => {
    const getCurrentPosition = vi.fn((_: PositionCallback, fail: PositionErrorCallback) =>
      fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    )
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    useUserLocation.getState().locate()
    expect(useUserLocation.getState().status).toBe('denied')
    useUserLocation.getState().chooseArea(bajada)
    expect(useUserLocation.getState().status).toBe('found')
  })
})
