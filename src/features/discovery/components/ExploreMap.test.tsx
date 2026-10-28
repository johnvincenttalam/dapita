import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import type { MapPin } from '@/components/shared/MapView'
import { useUserLocation } from '@/hooks/use-user-location'
import { createQueryClient } from '@/lib/query-client'
import ExplorePage from '@/routes/ExplorePage'
import type { Coordinates } from '@/types/common'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Leaflet needs a real layout engine, so the map is a list of pin buttons here; the
// browser run covers the real one.
vi.mock('@/components/shared/MapView', () => ({
  default: ({
    pins,
    selectedId,
    onSelect,
    userPosition,
    label,
    children,
  }: {
    pins: MapPin[]
    selectedId?: string
    onSelect?: (id: string) => void
    userPosition?: Coordinates
    label: string
    children?: ReactNode
  }) => (
    <div role="region" aria-label={label}>
      {pins.map((pin) => (
        <button key={pin.id} type="button" aria-pressed={pin.id === selectedId} onClick={() => onSelect?.(pin.id)}>
          Pin: {pin.label}
        </button>
      ))}
      {userPosition ? <p>You are here</p> : null}
      {children}
    </div>
  ),
}))

const NOW = new Date('2026-10-21T03:00:00Z')
// Near Abreeza, Bajada.
const HERE = { latitude: 7.0913, longitude: 125.6114 }

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/explore', Component: ExplorePage }], { initialEntries: [path] })
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

function stubGeolocation(result: 'allow' | 'deny') {
  const getCurrentPosition = vi.fn((success: PositionCallback, failure?: PositionErrorCallback | null) => {
    if (result === 'allow') success({ coords: HERE } as GeolocationPosition)
    else failure?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError)
  })
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  useUserLocation.setState({ status: 'idle', position: undefined })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Explore map view', () => {
  it('switches between list and map, keeping the filters', async () => {
    const user = userEvent.setup()
    const router = renderAt('/explore?category=barber')
    const view = await screen.findByRole('group', { name: 'View' })
    expect(within(view).getByRole('link', { name: 'List' })).toHaveAttribute('aria-current', 'true')

    await user.click(within(view).getByRole('link', { name: 'Map' }))
    expect(router.state.location.search).toBe('?category=barber&view=map')
    const map = await screen.findByRole('region', { name: 'Map of shops' })
    expect(within(map).getAllByRole('button', { name: /^Pin:/ }).length).toBeGreaterThan(0)
    expect(within(map).getByRole('button', { name: 'Pin: The Good Cut Barbershop' })).toBeInTheDocument()
    expect(within(map).queryByRole('button', { name: 'Pin: Serenity Wellness Spa' })).not.toBeInTheDocument()
  })

  it('shows the shop for a pin, linked to its profile', async () => {
    const user = userEvent.setup()
    renderAt('/explore?view=map')
    const map = await screen.findByRole('region', { name: 'Map of shops' })
    await user.click(within(map).getByRole('button', { name: 'Pin: Serenity Wellness Spa' }))

    expect(within(map).getByRole('button', { name: 'Pin: Serenity Wellness Spa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const card = within(map).getByRole('article')
    expect(within(card).getByRole('link', { name: 'Serenity Wellness Spa' })).toHaveAttribute(
      'href',
      '/shops/serenity-wellness-spa',
    )
    await user.click(within(map).getByRole('button', { name: 'Close' }))
    expect(within(map).queryByRole('article')).not.toBeInTheDocument()
  })

  it('adds distances once the viewer shares their location', async () => {
    const user = userEvent.setup()
    stubGeolocation('allow')
    renderAt('/explore?view=map')
    const map = await screen.findByRole('region', { name: 'Map of shops' })
    await user.click(within(map).getByRole('button', { name: 'Use my location' }))

    expect(await screen.findByText(/Nearest shops first/)).toBeInTheDocument()
    expect(within(map).getByText('You are here')).toBeInTheDocument()
    await user.click(within(map).getAllByRole('button', { name: /^Pin:/ })[0]!)
    expect(within(map).getByRole('article')).toHaveTextContent(/\d+(\.\d)? km|\d+ m/)
  })

  it('explains what to do when location is refused', async () => {
    const user = userEvent.setup()
    stubGeolocation('deny')
    renderAt('/explore?view=map')
    const map = await screen.findByRole('region', { name: 'Map of shops' })
    await user.click(within(map).getByRole('button', { name: 'Use my location' }))

    expect(await screen.findByText(/Location is turned off for this site/)).toBeInTheDocument()
    expect(within(map).queryByText('You are here')).not.toBeInTheDocument()
    expect(within(map).getAllByRole('button', { name: /^Pin:/ }).length).toBeGreaterThan(0)
  })
})
