import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import MerchantCalendarPage from '@/routes/MerchantCalendarPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/business/calendar', Component: MerchantCalendarPage }], {
    initialEntries: [path],
  })
  render(
    <AppProviders queryClient={createQueryClient()}>
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
})

describe('MerchantCalendarPage', () => {
  it('shows today by staff member, each appointment opening its booking', async () => {
    renderAt('/business/calendar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Wednesday, October 21' })).toBeInTheDocument()

    const ken = await screen.findByRole('region', { name: 'Ken' })
    const kenLinks = within(ken).getAllByRole('link')
    expect(kenLinks.map((link) => link.getAttribute('aria-label'))).toEqual([
      expect.stringMatching(/^10:00–10:30 AM, John Dela Cruz, Men’s Haircut, done$/),
      expect.stringMatching(/^1:30–2:00 PM, Alyssa Santos, Men’s Haircut, confirmed$/),
    ])
    expect(kenLinks[0]).toHaveAttribute('href', '/business/bookings/bk_gc_john?tab=past')
    expect(within(screen.getByRole('region', { name: 'Mark' })).getByRole('link')).toHaveAccessibleName(
      /Mark Rivera, Hair \+ Beard Trim, confirmed/,
    )
  })

  it('moves a day at a time and marks requests that still need an answer', async () => {
    const user = userEvent.setup()
    const router = renderAt('/business/calendar')
    await user.click(await screen.findByRole('button', { name: 'Next day' }))

    expect(router.state.location.search).toBe('?date=2026-10-22')
    expect(await screen.findByRole('heading', { level: 2, name: 'Thursday, October 22' })).toBeInTheDocument()
    const any = await screen.findByRole('region', { name: 'Any staff' })
    expect(within(any).getByRole('link')).toHaveAccessibleName(/Carlos Tan, Haircut & Styling, request/)
    expect(within(any).getByRole('link')).toHaveAttribute('href', '/business/bookings/bk_gc_carlos')

    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(router.state.location.search).toBe('')
  })

  it('shows the week with each day’s appointments', async () => {
    const user = userEvent.setup()
    const router = renderAt('/business/calendar')
    await user.click(await screen.findByRole('button', { name: 'Week' }))
    expect(router.state.location.search).toBe('?view=week')
    expect(await screen.findByRole('heading', { level: 2, name: 'October 19 – 25' })).toBeInTheDocument()

    const thursday = screen.getByRole('region', { name: /Thursday, October 22/ })
    expect(within(thursday).getByRole('link', { name: /Carlos Tan/ })).toBeInTheDocument()
    const friday = screen.getByRole('region', { name: /Friday, October 23/ })
    expect(within(friday).getByRole('link', { name: /Andrea Reyes/ })).toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: /Wednesday, October 21/ })).getAllByRole('link', { name: /^\d/ }),
    ).toHaveLength(3)

    // A day heading opens that day.
    await user.click(within(friday).getByRole('link', { name: 'Open Friday, October 23' }))
    expect(router.state.location.search).toBe('?date=2026-10-23')
  })

  it('says when the shop is closed', async () => {
    renderAt('/business/calendar?date=2026-10-31')
    expect(await screen.findByText('Closed: Team training day')).toBeInTheDocument()
  })
})
