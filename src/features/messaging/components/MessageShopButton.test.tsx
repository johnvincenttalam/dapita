import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { useSession } from '@/features/auth/api/queries'
import { MessageShopButton } from '@/features/messaging/components/MessageShopButton'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

/** Shows once the session has loaded, so a test can tell "not rendered" from "not loaded yet". */
function SessionReady() {
  const { isPending } = useSession()
  return isPending ? null : <p>Session ready</p>
}

function renderButton(account: MockAccount | null, bookingId?: string) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  const router = createMemoryRouter(
    [
      {
        path: '/shops/the-good-cut-barbershop',
        element: (
          <>
            <SessionReady />
            <MessageShopButton businessId="biz_good_cut" bookingId={bookingId} />
          </>
        ),
      },
      { path: '/inbox/:conversationId', element: <p>Thread</p> },
    ],
    { initialEntries: ['/shops/the-good-cut-barbershop'] },
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
})

describe('MessageShopButton', () => {
  it('opens the customer’s conversation with the shop', async () => {
    const user = userEvent.setup()
    const router = renderButton('customer', 'bk_andrea_pending')
    await user.click(await screen.findByRole('button', { name: 'Message shop' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inbox/conv_andrea_goodcut'))
  })

  it('asks guests to sign in and come back', async () => {
    renderButton(null)
    expect(await screen.findByRole('link', { name: 'Message shop' })).toHaveAttribute(
      'href',
      '/auth/sign-in?next=%2Fshops%2Fthe-good-cut-barbershop',
    )
  })

  it('isn’t offered to the shop’s own team', async () => {
    renderButton('merchant')
    await screen.findByText('Session ready')
    expect(screen.queryByRole('button', { name: 'Message shop' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Message shop' })).not.toBeInTheDocument()
  })
})
