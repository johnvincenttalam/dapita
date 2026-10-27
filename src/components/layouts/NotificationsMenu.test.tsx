import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { NotificationsMenu } from '@/components/layouts/NotificationsMenu'
import { createQueryClient } from '@/lib/query-client'
import type { NotificationAudience } from '@/lib/notifications'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function renderBell(account: MockAccount, audience: NotificationAudience) {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  const router = createMemoryRouter(
    [
      { path: '/', element: <NotificationsMenu audience={audience} /> },
      { path: '*', element: <p>Elsewhere</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

beforeEach(() => localStorage.clear())

describe('NotificationsMenu', () => {
  it('tells a customer about new messages and proposed times, opening each', async () => {
    const user = userEvent.setup()
    const router = renderBell('customer', 'customer')
    await user.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /New time proposed/ })).toHaveAttribute(
      'href',
      '/bookings/bk_andrea_alternative',
    )
    await user.click(within(dialog).getByRole('link', { name: /New message from Serenity Wellness Spa/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inbox/conv_andrea_serenity'))
  })

  it('tells a shop about requests and messages', async () => {
    renderBell('merchant', 'merchant')
    // Three pending requests and two conversations with unread messages in the seed.
    expect(await screen.findByRole('button', { name: 'Notifications, 5 unread' })).toBeInTheDocument()
  })

  it('tells an admin what’s waiting, and remembers “mark all read”', async () => {
    const user = userEvent.setup()
    renderBell('admin', 'admin')
    await user.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: /Conversation reported/ })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Mark all read' }))
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })
})
