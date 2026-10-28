import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { useSession } from '@/features/auth/api/queries'
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton'
import { createQueryClient } from '@/lib/query-client'
import { favoritesService } from '@/services/favorites.service'
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

function renderButton(account: MockAccount | null, businessId = 'biz_glow_go') {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  const router = createMemoryRouter(
    [
      {
        path: '/shops/:shopSlug',
        element: (
          <>
            <SessionReady />
            <FavoriteButton businessId={businessId} shopName="Glow & Go" />
          </>
        ),
      },
      { path: '/favorites', element: <p>Favorites page</p> },
    ],
    { initialEntries: ['/shops/glow-and-go-beauty-salon'] },
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

describe('FavoriteButton', () => {
  it('saves and removes the shop', async () => {
    const user = userEvent.setup()
    renderButton('customer')
    const heart = await screen.findByRole('button', { name: 'Save Glow & Go' })
    await waitFor(() => expect(heart).toBeEnabled())
    expect(heart).toHaveAttribute('aria-pressed', 'false')

    await user.click(heart)
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('Saved to favorites')).toBeInTheDocument()
    expect((await favoritesService.listMyFavorites()).map((shop) => shop.id)).toEqual(['biz_glow_go'])

    await waitFor(() => expect(heart).toBeEnabled())
    await user.click(heart)
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    await waitFor(async () => expect(await favoritesService.listMyFavorites()).toEqual([]))
  })

  it('asks guests to sign in and come back', async () => {
    renderButton(null)
    expect(await screen.findByRole('link', { name: 'Save Glow & Go' })).toHaveAttribute(
      'href',
      '/auth/sign-in?next=%2Fshops%2Fglow-and-go-beauty-salon',
    )
  })

  it('isn’t offered on the owner’s own shop', async () => {
    renderButton('merchant', 'biz_good_cut')
    await screen.findByText('Session ready')
    expect(screen.queryByRole('button', { name: 'Save Glow & Go' })).not.toBeInTheDocument()
  })

  it('isn’t offered to admins', async () => {
    renderButton('admin')
    await screen.findByText('Session ready')
    expect(screen.queryByRole('button', { name: 'Save Glow & Go' })).not.toBeInTheDocument()
  })
})
