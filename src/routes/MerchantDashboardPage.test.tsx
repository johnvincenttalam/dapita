import { QueryClient } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { bookingsService } from '@/services/bookings.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import MerchantDashboardPage from '@/routes/MerchantDashboardPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')

function renderDashboard() {
  const router = createMemoryRouter([{ path: '/business', Component: MerchantDashboardPage }], {
    initialEntries: ['/business'],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
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

describe('MerchantDashboardPage', () => {
  it('greets the owner with today’s date and the day’s numbers', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { level: 1, name: 'Good morning, Paolo' })).toBeInTheDocument()
    expect(screen.getByText('Wednesday, October 21 · The Good Cut Barbershop')).toBeInTheDocument()

    const requests = await screen.findByRole('region', { name: 'Needs your answer' })
    expect(await within(requests).findByText(/^3 waiting\./)).toBeInTheDocument()
    const today = screen.getByRole('region', { name: 'Today' })
    expect(within(today).getByText('3 appointments · 1 done')).toBeInTheDocument()
    expect(within(today).getByText('Nothing confirmed for the next 7 days yet.')).toBeInTheDocument()
  })

  it('lists requests by deadline, each opening its booking', async () => {
    renderDashboard()
    const panel = await screen.findByRole('region', { name: 'Needs your answer' })
    const rows = await within(panel).findAllByRole('link', { name: /Answer (by|within)/ })

    expect(rows.map((row) => row.textContent?.match(/Carlos Tan|Bea Villanueva|Andrea Reyes/)?.[0])).toEqual([
      'Bea Villanueva',
      'Andrea Reyes',
      'Carlos Tan',
    ])
    expect(rows[0]).toHaveAttribute('href', '/business/bookings/bk_gc_bea')
    expect(within(panel).getByRole('link', { name: 'All requests' })).toHaveAttribute('href', '/business/bookings')
  })

  it('shows today’s appointments in order, marking what is done and what is next', async () => {
    renderDashboard()
    const panel = await screen.findByRole('region', { name: 'Today' })
    const rows = await within(panel).findAllByRole('listitem')
    const [first, second] = rows as [HTMLElement, HTMLElement, ...HTMLElement[]]

    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/10:00 AM.*John Dela Cruz.*Done/),
      expect.stringMatching(/11:30 AM.*Next/),
      expect.stringMatching(/1:30 PM/),
    ])
    expect(within(first).getByRole('link')).toHaveAttribute('href', '/business/bookings/bk_gc_john?tab=past')
    expect(within(second).getByRole('link')).toHaveAttribute('href', '/business/bookings/bk_gc_mark?tab=upcoming')
  })

  it('shows the latest customer messages, unread first', async () => {
    renderDashboard()
    const panel = await screen.findByRole('region', { name: 'Recent messages' })
    const rows = await within(panel).findAllByRole('link', { name: /unread/ })
    expect(rows.map((row) => row.textContent?.match(/Andrea Reyes|Carlos Tan/)?.[0])).toEqual([
      'Andrea Reyes',
      'Carlos Tan',
    ])
    expect(rows[0]).toHaveAttribute('href', '/business/messages/conv_andrea_goodcut')
    expect(within(panel).getByRole('link', { name: 'All messages' })).toHaveAttribute('href', '/business/messages')
  })

  it('says so when every request has been answered', async () => {
    for (const id of ['bk_gc_carlos', 'bk_gc_bea', 'bk_andrea_pending']) {
      await bookingsService.respondToBooking(id, { action: 'decline' })
    }
    renderDashboard()
    const panel = await screen.findByRole('region', { name: 'Needs your answer' })
    expect(await within(panel).findByText('You’re all caught up')).toBeInTheDocument()
  })
})
