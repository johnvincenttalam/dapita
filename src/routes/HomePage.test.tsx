import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { useLocalInterests } from '@/features/interests/interests-store'
import { resetInterestsSync } from '@/features/interests/use-interests'
import { useUserLocation } from '@/hooks/use-user-location'
import { ApiError } from '@/lib/api-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { profileService } from '@/services/profile.service'
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
  useLocalInterests.getState().clear()
  resetInterestsSync()
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

describe('What are you here for?', () => {
  it('asks a first-time visitor and puts their pick first', async () => {
    const { user } = renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'What are you here for?' })).toBeInTheDocument()
    const featured = await screen.findByRole('list', { name: 'Featured shops' })
    expect(within(featured).getAllByRole('listitem')[0]).not.toHaveTextContent('The Good Cut Barbershop')
    await user.click(screen.getByRole('button', { name: 'Barber', pressed: false }))
    expect(screen.getByRole('button', { name: 'Barber', pressed: true })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('Barber first. Change this any time from this page.')
    await waitFor(() =>
      expect(within(featured).getAllByRole('listitem')[0]).toHaveTextContent('The Good Cut Barbershop'),
    )
    // Scoped to the grid: the footer also links "Barbers".
    const grid = screen.getByRole('region', { name: 'Browse by category' })
    expect(within(grid).getByRole('link', { name: /^Barber/ })).toHaveAccessibleName('Barber (your pick)')
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore?category=barber')
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/explore?category=barber')
  })

  it('two picks read as a pair and link Explore to everything', async () => {
    const { user } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Salon', pressed: false }))
    await user.click(screen.getByRole('button', { name: 'Nails', pressed: false }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Salon and Nails first. Change this any time from this page.',
    )
    expect(screen.getByRole('link', { name: 'See all' })).toHaveAttribute('href', '/explore')
    expect(screen.getByRole('link', { name: 'More' })).toHaveAttribute('href', '/explore')
  })

  it('Not now hides the card and changes nothing', async () => {
    const { user, unmount } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
    const featured = await screen.findByRole('list', { name: 'Featured shops' })
    expect(within(featured).getAllByRole('listitem')[0]).not.toHaveTextContent('The Good Cut Barbershop')

    unmount()
    renderRoute('/')
    expect(await screen.findByRole('list', { name: 'Featured shops' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
  })

  it('a return visit shows the line, and Change reopens the chips', async () => {
    useLocalInterests.getState().set(['cat_barber'])
    const { user } = renderRoute('/')
    expect(await screen.findByText(/Barber first/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('button', { name: 'Barber', pressed: true })).toBeInTheDocument()
    // Focus follows the swap instead of falling back to the page.
    expect(screen.getByRole('heading', { name: 'What are you here for?' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change' })).toHaveFocus()
  })

  it('a signed-in customer saves to the account', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    const { user } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Nails', pressed: false }))
    expect(await screen.findByRole('status')).toHaveTextContent('Nails first. Change this any time from your profile.')
    await waitFor(async () => expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_nails']))
  })

  it('shows nothing when the account answer cannot load', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    vi.spyOn(profileService, 'getMyInterests').mockRejectedValue(new ApiError('Server down', 500))
    renderRoute('/')
    expect(await screen.findByRole('list', { name: 'Featured shops' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
  })

  it('does not ask an answered customer again when their answer loads late', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    await profileService.updateMyInterests(['cat_salon'])
    vi.spyOn(profileService, 'getMyInterests').mockRejectedValueOnce(new ApiError('Server down', 500))
    const { user } = renderRoute('/')
    expect(await screen.findByRole('list', { name: 'Featured shops' })).toBeInTheDocument()
    // Choosing an area mounts another reader of the answer, which loads it again.
    await chooseBajada(user)
    expect(await screen.findByText(/Salon first/)).toHaveTextContent('Salon first · Change')
    expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
  })

  it('keeps the card open when Not now could not be saved', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    vi.spyOn(profileService, 'updateMyInterests').mockRejectedValueOnce(new ApiError('Could not save.', 500))
    const toastError = vi.spyOn(toast, 'error')
    const { user } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Could not save.'))
    expect(await screen.findByRole('heading', { name: 'What are you here for?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Not now' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument(),
    )
    await waitFor(async () => expect((await profileService.getMyInterests()).answeredAt).toBeDefined())
  })

  it('points a signed-in user without a profile page back to this page', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.admin.id)
    const { user } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Nails', pressed: false }))
    expect(await screen.findByRole('status')).toHaveTextContent('Nails first. Change this any time from this page.')
  })

  it('shows nothing for a guest whose only pick was retired', async () => {
    useLocalInterests.getState().set(['cat_gowns'])
    renderRoute('/')
    expect(await screen.findByRole('list', { name: 'Featured shops' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Browse by category' })).toBeInTheDocument()
    expect(screen.queryByText(/Showing everything/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'What are you here for?' })).not.toBeInTheDocument()
  })

  it('recommended near you also leads with the pick', async () => {
    useLocalInterests.getState().set(['cat_barber'])
    const { user } = renderRoute('/')
    await chooseBajada(user)
    const row = await screen.findByRole('list', { name: 'Recommended near you' })
    const items = within(row).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Barbershop')
    // The nearest barbershop is already first with no pick; the second one only moves up for the pick.
    expect(items[1]).toHaveTextContent('Fade Factory Barbers')
  })
})
