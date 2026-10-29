import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { useUserLocation } from '@/hooks/use-user-location'
import { ApiError } from '@/lib/api-client'
import { recommendationsService } from '@/services/recommendations.service'
import { renderRoute } from '@/test/render'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const distance = /^\d+(\.\d)? (m|km)$/

async function chooseBajada(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Choose your area' }))
  await user.click(await screen.findByRole('button', { name: 'Bajada' }))
}

beforeEach(() => {
  localStorage.clear()
  useUserLocation.getState().clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Home page, location first', () => {
  it('asks where you are on a first visit', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Where are you?' })).toBeInTheDocument()
    expect(screen.getByText('We’ll show shops near you. Your location stays on this device.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recommended near you' })).not.toBeInTheDocument()
  })

  it('choosing an area shows "Recommended near you" with tags', async () => {
    const { user } = renderRoute('/')
    await chooseBajada(user)
    const row = await screen.findByRole('list', { name: 'Recommended near you' })
    expect(within(row).getAllByText(/^(Nearest|Popular near you|Popular in .+)$/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Where are you?' })).not.toBeInTheDocument()
    expect(screen.getByText(/Showing shops near/).parentElement).toHaveTextContent('Showing shops near Bajada')
  })

  it('featured shops show distances once a location is set', async () => {
    const { user } = renderRoute('/')
    await chooseBajada(user)
    const featured = await screen.findByRole('list', { name: 'Featured shops' })
    expect(within(featured).getAllByText(distance).length).toBeGreaterThan(0)
  })

  it('Change brings the prompt back', async () => {
    const { user } = renderRoute('/')
    await chooseBajada(user)
    await user.click(await screen.findByRole('button', { name: 'Change location' }))
    expect(await screen.findByRole('heading', { name: 'Where are you?' })).toBeInTheDocument()
  })

  it('a denied location shows the message and still lets you choose an area', async () => {
    const getCurrentPosition = vi.fn((_: PositionCallback, fail: PositionErrorCallback) =>
      fail({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    )
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
    const { user } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Use my location' }))
    expect(await screen.findByText(/location is turned off/i)).toBeInTheDocument()
    await chooseBajada(user)
    expect(await screen.findByRole('list', { name: 'Recommended near you' })).toBeInTheDocument()
    expect(screen.queryByText(/location is turned off/i)).not.toBeInTheDocument()
  })

  it('a failed recommendations request shows a retryable error for the row only', async () => {
    vi.spyOn(recommendationsService, 'listRecommendations').mockRejectedValue(new ApiError('Server down', 500))
    const { user } = renderRoute('/')
    await chooseBajada(user)
    expect(await screen.findByText('We couldn’t load suggestions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Featured shops' })).toBeInTheDocument()
  })
})
