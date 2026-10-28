import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import MerchantProfilePage from '@/routes/MerchantProfilePage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')
const SLUG = 'the-good-cut-barbershop'

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/business/profile', Component: MerchantProfilePage }], {
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

describe('MerchantProfilePage', () => {
  it('saves the listing details customers see', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile')
    expect(await screen.findByRole('heading', { level: 1, name: 'Business profile' })).toBeInTheDocument()
    const name = await screen.findByRole('textbox', { name: /Business name/ })
    expect(screen.getByRole('link', { name: 'View shop page' })).toHaveAttribute('href', `/shops/${SLUG}`)
    expect(name).toHaveValue('The Good Cut Barbershop')
    expect(screen.getByRole('checkbox', { name: 'Barber' })).toBeChecked()
    await user.clear(name)
    await user.type(name, 'Good Cut Davao')
    await user.selectOptions(screen.getByRole('combobox', { name: /Area/ }), 'Lanang')
    await user.click(screen.getByRole('button', { name: 'Save details' }))

    expect(await screen.findByText('Business details saved.')).toBeInTheDocument()
    expect(await shopsService.getShop(SLUG)).toMatchObject({ name: 'Good Cut Davao', area: { name: 'Lanang' } })
  })

  it('explains what is missing before saving details', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile')
    await user.clear(await screen.findByRole('textbox', { name: /Description/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Barber' }))
    await user.click(screen.getByRole('button', { name: 'Save details' }))

    expect(await screen.findByText('Description is required')).toBeInTheDocument()
    expect(screen.getByText('Choose at least one category')).toBeInTheDocument()
  })

  it('closes a day and adds split hours', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile?tab=hours')
    await user.click(await screen.findByRole('switch', { name: 'Open on Friday' }))
    const monday = screen.getByRole('group', { name: 'Monday' })
    await user.click(within(monday).getByRole('button', { name: 'Add hours' }))
    await user.selectOptions(within(monday).getAllByRole('combobox', { name: 'Opens' })[1] as HTMLElement, '6:00 PM')
    await user.selectOptions(within(monday).getAllByRole('combobox', { name: 'Closes' })[1] as HTMLElement, '10:00 PM')
    await user.click(screen.getByRole('button', { name: 'Save hours' }))

    // 10:00–21:00 and 18:00–22:00 overlap.
    expect(await within(monday).findByText('Opening times on the same day can’t overlap')).toBeInTheDocument()
    await user.selectOptions(within(monday).getAllByRole('combobox', { name: 'Closes' })[0] as HTMLElement, '2:00 PM')
    await user.click(screen.getByRole('button', { name: 'Save hours' }))

    expect(await screen.findByText('Opening hours saved. New bookings follow them.')).toBeInTheDocument()
    const { hours } = await shopsService.getShop(SLUG)
    expect(hours[5]).toEqual([])
    expect(hours[1]).toEqual([
      { open: '10:00', close: '14:00' },
      { open: '18:00', close: '22:00' },
    ])
  })

  it('adds a closure, warning about bookings on those dates, and removes it', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile?tab=closures')
    const add = await screen.findByRole('region', { name: 'Add a closure' })
    await user.type(within(add).getByLabelText(/First day/), '2026-10-21')
    // The last day fills in to match, for the usual one-day closure.
    expect(within(add).getByLabelText(/Last day/)).toHaveValue('2026-10-21')
    await user.clear(within(add).getByLabelText(/Last day/))
    await user.type(within(add).getByLabelText(/Last day/), '2026-10-22')
    // Three confirmed appointments today, one request tomorrow (seed data).
    expect(await within(add).findByText(/4 bookings and requests fall on these dates/)).toBeInTheDocument()

    await user.clear(within(add).getByLabelText(/First day/))
    await user.type(within(add).getByLabelText(/First day/), '2026-12-24')
    await user.clear(within(add).getByLabelText(/Last day/))
    await user.type(within(add).getByLabelText(/Last day/), '2026-12-26')
    await user.type(within(add).getByRole('textbox', { name: /Reason/ }), 'Christmas')
    expect(within(add).queryByText(/fall on these dates/)).not.toBeInTheDocument()
    await user.click(within(add).getByRole('button', { name: 'Add closure' }))

    const list = await screen.findByRole('region', { name: 'Upcoming closures' })
    expect(await within(list).findByText('Christmas')).toBeInTheDocument()
    expect((await shopsService.getShop(SLUG)).closures.map((closure) => closure.reason)).toContain('Christmas')

    await user.click(within(list).getByRole('button', { name: /Remove closure Christmas/ }))
    await waitFor(() => expect(within(list).queryByText('Christmas')).not.toBeInTheDocument())
  })

  it('saves policies as a new version', async () => {
    const user = userEvent.setup()
    renderAt('/business/profile?tab=policies')
    const cancellation = await screen.findByRole('textbox', { name: /Cancellation policy/ })
    expect(screen.getByText(/Version 2\./)).toBeInTheDocument()
    await user.clear(cancellation)
    await user.type(cancellation, 'Free cancellation up to 6 hours before your appointment.')
    await user.click(screen.getByRole('button', { name: 'Save booking rules' }))

    expect(await screen.findByText('Booking rules saved. New requests use version 3.')).toBeInTheDocument()
    expect((await shopsService.getShop(SLUG)).policies).toMatchObject({ version: 3 })
  })
})
