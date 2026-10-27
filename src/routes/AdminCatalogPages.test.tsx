import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { authService } from '@/services/auth.service'
import { catalogService } from '@/services/catalog.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import AdminCategoriesPage from '@/routes/AdminCategoriesPage'
import AdminLogsPage from '@/routes/AdminLogsPage'
import AdminUsersPage from '@/routes/AdminUsersPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/categories', Component: AdminCategoriesPage },
      { path: '/admin/users', Component: AdminUsersPage },
      { path: '/admin/logs', Component: AdminLogsPage },
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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.admin.id)
})

describe('AdminCategoriesPage', () => {
  it('shows the taxonomy with usage', async () => {
    renderAt('/admin/categories')
    expect(await screen.findByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument()
    const barber = await screen.findByRole('group', { name: 'Barber' })
    expect(barber).toHaveTextContent('3 shops')
    expect(within(barber).getByText('Beard & Shave')).toBeInTheDocument()
  })

  it('hides a subcategory from customers', async () => {
    const user = userEvent.setup()
    renderAt('/admin/categories')
    await user.click(await screen.findByRole('button', { name: 'Edit Beard & Shave' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Beard & Shave' })
    await user.click(within(dialog).getByRole('radio', { name: 'Hidden' }))
    expect(within(dialog).getByText(/services use it/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Beard & Shave saved.')).toBeInTheDocument()
    await waitFor(async () =>
      expect((await catalogService.getCategories()).map((category) => category.id)).not.toContain('sub_beard'),
    )
  })

  it('adds a subcategory', async () => {
    const user = userEvent.setup()
    renderAt('/admin/categories')
    const barber = await screen.findByRole('group', { name: 'Barber' })
    await user.type(within(barber).getByRole('textbox', { name: 'New subcategory in Barber' }), 'Kids’ Cuts')
    await user.click(within(barber).getByRole('button', { name: 'Add' }))
    expect(await within(barber).findByText('Kids’ Cuts')).toBeInTheDocument()
  })

  it('features a live shop on the home page', async () => {
    const user = userEvent.setup()
    renderAt('/admin/categories')
    const featured = await screen.findByRole('region', { name: 'Featured shops' })
    await user.click(await within(featured).findByRole('switch', { name: 'Feature Polished Nail Studio' }))
    await waitFor(async () =>
      expect((await shopsService.getFeaturedShops()).map((shop) => shop.id)).toContain('biz_polished'),
    )
  })
})

describe('AdminUsersPage', () => {
  it('finds accounts by name or email', async () => {
    const user = userEvent.setup()
    renderAt('/admin/users')
    const list = await screen.findByRole('list', { name: 'Accounts' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    await user.type(screen.getByRole('searchbox', { name: 'Search accounts' }), 'owner@')
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1))
    expect(within(list).getByText('Paolo Mendoza')).toBeInTheDocument()
  })

  it('suspends and reinstates an account with a reason', async () => {
    const user = userEvent.setup()
    renderAt('/admin/users')
    expect(await screen.findByText('Mika Santos')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suspend Mika Santos' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Suspend Andrea Reyes' }))
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Andrea Reyes?' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'Repeated abuse in messages.')
    await user.click(within(dialog).getByRole('button', { name: 'Suspend' }))

    expect(await screen.findByText('Andrea Reyes is suspended and signed out.')).toBeInTheDocument()
    expect(await screen.findByText(/Repeated abuse in messages/)).toBeInTheDocument()
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    expect(await authService.getSession()).toBeNull()
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.admin.id)

    await user.click(screen.getByRole('button', { name: 'Reinstate Andrea Reyes' }))
    const again = await screen.findByRole('dialog', { name: 'Reinstate Andrea Reyes?' })
    await user.type(within(again).getByRole('textbox', { name: 'Reason' }), 'Spoke with her, resolved.')
    await user.click(within(again).getByRole('button', { name: 'Reinstate' }))
    expect(await screen.findByText('Andrea Reyes can sign in again.')).toBeInTheDocument()
  })
})

describe('AdminLogsPage', () => {
  it('says plainly that nothing can fail yet', async () => {
    renderAt('/admin/logs')
    expect(await screen.findByRole('heading', { level: 1, name: 'Logs' })).toBeInTheDocument()
    expect(screen.getByText('No failures recorded')).toBeInTheDocument()
  })
})
