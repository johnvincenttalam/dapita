import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import MerchantServiceEditorPage from '@/routes/MerchantServiceEditorPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/business/services', element: <p>Services list</p> },
      { path: '/business/services/new', Component: MerchantServiceEditorPage },
      { path: '/business/services/:serviceId', Component: MerchantServiceEditorPage },
    ],
    { initialEntries: [path] },
  )
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

/** The live preview line, which styles its label and value separately. */
const preview = () =>
  screen.getByText((_, element) => element?.tagName === 'P' && /^Customers see:/.test(element.textContent ?? ''))

const publicServices = () => shopsService.getShopServices('the-good-cut-barbershop')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
})

describe('MerchantServiceEditorPage', () => {
  it('adds a service that customers can see', async () => {
    const user = userEvent.setup()
    const router = renderAt('/business/services/new')
    expect(await screen.findByRole('heading', { level: 1, name: 'Add service' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /Service name/ }), 'Buzz Cut')
    await user.click(screen.getByRole('radio', { name: 'Beard & Shave' }))
    await user.type(screen.getByRole('textbox', { name: /^Price/ }), '150')
    await user.click(screen.getByRole('radio', { name: 'Other' }))
    const duration = screen.getByRole('spinbutton', { name: /Duration/ })
    await user.clear(duration)
    await user.type(duration, '20')
    expect(preview()).toHaveTextContent('Customers see: ₱150 · 20 mins')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    expect(await screen.findByText('Buzz Cut is on your menu.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/business/services'))
    expect((await publicServices()).find((service) => service.name === 'Buzz Cut')).toMatchObject({
      categoryId: 'sub_beard',
      price: { type: 'fixed', amount: 150 },
      durationMinutes: 20,
      active: true,
    })
  })

  it('asks for both ends of a price range, in order', async () => {
    const user = userEvent.setup()
    renderAt('/business/services/new')
    await user.type(await screen.findByRole('textbox', { name: /Service name/ }), 'Fade')
    await user.click(screen.getByRole('radio', { name: 'Price range' }))
    await user.type(screen.getByRole('textbox', { name: /Lowest price/ }), '500')
    await user.type(screen.getByRole('textbox', { name: /Highest price/ }), '300')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    expect(await screen.findByText('The highest price must be more than the lowest')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Highest price/ })).toHaveAttribute('aria-invalid', 'true')
  })

  it('hides the amount for price on consultation', async () => {
    const user = userEvent.setup()
    renderAt('/business/services/new')
    await user.click(await screen.findByRole('radio', { name: 'Price on consultation' }))
    expect(screen.queryByRole('textbox', { name: /Price/ })).not.toBeInTheDocument()
    expect(preview()).toHaveTextContent('Customers see: Price on consultation · 30 mins')
  })

  it('edits a saved service', async () => {
    const user = userEvent.setup()
    const router = renderAt('/business/services/svc_mens_haircut')
    expect(await screen.findByRole('heading', { level: 1, name: 'Edit Men’s Haircut' })).toBeInTheDocument()
    const price = screen.getByRole('textbox', { name: /^Price/ })
    expect(price).toHaveValue('250')
    expect(screen.getByRole('switch', { name: 'Mark as popular' })).toBeChecked()

    await user.clear(price)
    await user.type(price, '280')
    await user.click(screen.getByRole('switch', { name: 'Show to customers' }))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Changes to Men’s Haircut saved.')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/business/services'))
    expect((await publicServices()).map((service) => service.id)).not.toContain('svc_mens_haircut')
  })

  it('shows the server’s answer when the name is taken', async () => {
    const user = userEvent.setup()
    renderAt('/business/services/new')
    await user.type(await screen.findByRole('textbox', { name: /Service name/ }), 'Hot towel shave')
    await user.type(screen.getByRole('textbox', { name: /^Price/ }), '200')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('You already have a service called “Hot Towel Shave”.')
  })

  it('says so when the service doesn’t exist', async () => {
    renderAt('/business/services/svc_nope')
    expect(await screen.findByText('We couldn’t find that service.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All services' })).toHaveAttribute('href', '/business/services')
  })
})
