import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { merchantServicesService } from '@/services/merchant-services.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import MerchantServicesPage from '@/routes/MerchantServicesPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function renderPage() {
  const router = createMemoryRouter([{ path: '/business/services', Component: MerchantServicesPage }], {
    initialEntries: ['/business/services'],
  })
  const queryClient = createQueryClient()
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

const names = (section: HTMLElement) =>
  within(section)
    .getAllByRole('listitem')
    .map((row) => within(row).getByRole('heading').textContent)

const publicNames = async () =>
  (await shopsService.getShopServices('the-good-cut-barbershop')).map((service) => service.name)

async function openActions(name: string) {
  await userEvent.click(await screen.findByRole('button', { name: `More actions for ${name}` }))
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
})

describe('MerchantServicesPage', () => {
  it('shows the menu by category with prices and durations', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Services' })).toBeInTheDocument()
    const haircut = await screen.findByRole('region', { name: 'Haircut' })
    expect(names(haircut)).toEqual([
      'Men’s Haircut',
      'Haircut & Styling',
      'Kids’ Haircut (12 and under)',
      'Men’s Hair Color',
    ])
    expect(within(haircut).getByText('From ₱800 · 1 hr 30 mins')).toBeInTheDocument()
    expect(names(screen.getByRole('region', { name: 'Beard & Shave' }))).toEqual([
      'Hair + Beard Trim',
      'Hot Towel Shave',
    ])

    expect(screen.getByRole('link', { name: 'Add service' })).toHaveAttribute('href', '/business/services/new')
    expect(screen.getByRole('link', { name: 'View shop page' })).toHaveAttribute(
      'href',
      '/shops/the-good-cut-barbershop',
    )
    expect(within(haircut).getByRole('link', { name: 'Edit Men’s Haircut' })).toHaveAttribute(
      'href',
      '/business/services/svc_mens_haircut',
    )
  })

  it('hides a service from customers and shows it again', async () => {
    renderPage()
    await openActions('Hot Towel Shave')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Hide from customers' }))

    expect(await screen.findByText('Hot Towel Shave is hidden. Customers won’t see it.')).toBeInTheDocument()
    const beard = screen.getByRole('region', { name: 'Beard & Shave' })
    expect(await within(beard).findByText('Hidden')).toBeInTheDocument()
    expect(await publicNames()).not.toContain('Hot Towel Shave')

    await openActions('Hot Towel Shave')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Show to customers' }))
    await waitFor(async () => expect(await publicNames()).toContain('Hot Towel Shave'))
  })

  it('moves a service within its category', async () => {
    renderPage()
    await openActions('Men’s Haircut')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Move down' }))

    const haircut = screen.getByRole('region', { name: 'Haircut' })
    await waitFor(() => expect(names(haircut).slice(0, 2)).toEqual(['Haircut & Styling', 'Men’s Haircut']))
    await openActions('Haircut & Styling')
    expect(await screen.findByRole('menuitem', { name: 'Move up' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('deletes a service nobody has booked, and explains why a booked one stays', async () => {
    await merchantServicesService.createService('biz_good_cut', {
      name: 'Buzz Cut',
      categoryId: 'sub_haircut',
      description: '',
      requirements: '',
      price: { type: 'fixed', amount: 150 },
      durationMinutes: 20,
      bufferMinutes: 0,
      featured: false,
      active: true,
    })
    renderPage()

    await openActions('Men’s Haircut')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete…' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete service' }))
    expect(
      await screen.findByText('Customers have booked this service, so it can’t be deleted. Hide it instead.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Men’s Haircut' })).toBeInTheDocument()

    await openActions('Buzz Cut')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete…' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete service' }))
    expect(await screen.findByText('Buzz Cut deleted.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Buzz Cut' })).not.toBeInTheDocument())
  })
})
