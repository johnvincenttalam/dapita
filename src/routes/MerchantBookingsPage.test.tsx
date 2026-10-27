import { QueryClient } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { ApiError } from '@/lib/api-client'
import { bookingsService } from '@/services/bookings.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import MerchantBookingsPage from '@/routes/MerchantBookingsPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/business/bookings', Component: MerchantBookingsPage },
      { path: '/business/bookings/:bookingId', Component: MerchantBookingsPage },
    ],
    { initialEntries: [path] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function stubWideScreen() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === '(min-width: 1024px)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  )
}

describe('MerchantBookingsPage', () => {
  it('lists pending requests first with their deadline', async () => {
    renderAt('/business/bookings')
    expect(await screen.findByRole('heading', { level: 1, name: 'Bookings' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Requests/, selected: true })).toBeInTheDocument()

    const list = await screen.findByRole('list', { name: 'Requests' })
    const rows = within(list).getAllByRole('link')
    const names = rows.map((row) => row.textContent)
    for (const name of ['Carlos Tan', 'Bea Villanueva', mockUsers.customer.name]) {
      expect(names.some((text) => text?.includes(name))).toBe(true)
    }
    for (const row of rows.filter((r) => !r.textContent?.includes('New time proposed'))) {
      expect(row.textContent).toMatch(/Answer (by|within)/)
    }
  })

  it('unknown booking id shows the not-found state', async () => {
    renderAt('/business/bookings/bk_nope')
    expect(await screen.findByText('We couldn’t find that booking.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /All bookings/ })[0]).toHaveAttribute('href', '/business/bookings')
  })

  it('accepting moves the booking to Upcoming', async () => {
    const router = renderAt('/business/bookings/bk_gc_carlos')
    const detail = await screen.findByRole('article', { name: 'Carlos Tan' })
    await userEvent.click(within(detail).getByRole('button', { name: 'Accept' }))

    expect(await screen.findByText('Booking confirmed. Carlos Tan can see it now.')).toBeInTheDocument()
    await router.navigate('/business/bookings?tab=upcoming')
    const upcoming = await screen.findByRole('list', { name: 'Upcoming' })
    expect(await within(upcoming).findByText('Carlos Tan')).toBeInTheDocument()
  })

  it('keeps the same booking open on wide screens when an answer fails', async () => {
    stubWideScreen()
    // The request is closed elsewhere (here: declined) just before the owner presses Accept.
    const spy = vi.spyOn(bookingsService, 'respondToBooking')
    spy.mockImplementationOnce(async (id) => {
      spy.mockRestore()
      await bookingsService.respondToBooking(id, { action: 'decline' })
      throw new ApiError('This booking can no longer be changed.', 409)
    })
    const router = renderAt('/business/bookings')

    // The most urgent request opens, and its id goes in the URL so it stays put.
    const detail = await screen.findByRole('article', { name: 'Bea Villanueva' })
    expect(router.state.location.pathname).toBe('/business/bookings/bk_gc_bea')
    await userEvent.click(within(detail).getByRole('button', { name: 'Accept' }))

    const after = await screen.findByRole('article', { name: 'Bea Villanueva' })
    expect(await within(after).findByText('Declined')).toBeInTheDocument()
    expect(within(after).queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('moves focus to the list when only proposed times are left', async () => {
    await bookingsService.respondToBooking('bk_gc_carlos', { action: 'decline' })
    await bookingsService.respondToBooking('bk_gc_bea', { action: 'decline' })
    renderAt('/business/bookings/bk_andrea_pending')

    const detail = await screen.findByRole('article', { name: mockUsers.customer.name })
    const propose = within(detail).getByRole('button', { name: 'Propose time' })
    await waitFor(() => expect(propose).toBeEnabled())
    await userEvent.click(propose)
    await userEvent.click(await screen.findByRole('radio', { name: '4:00 PM' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send new time' }))

    const row = await screen.findByRole('link', { name: /New time proposed/ })
    await waitFor(() => expect(row).toHaveFocus())
  })
})
