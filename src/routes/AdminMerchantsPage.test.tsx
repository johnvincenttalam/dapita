import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import AdminMerchantReviewPage from '@/routes/AdminMerchantReviewPage'
import AdminMerchantsPage from '@/routes/AdminMerchantsPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const NOW = new Date('2026-10-21T03:00:00Z')

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/merchants', Component: AdminMerchantsPage },
      { path: '/admin/merchants/:businessId', Component: AdminMerchantReviewPage },
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
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.admin.id)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AdminMerchantsPage', () => {
  it('opens on the listings waiting for review', async () => {
    const user = userEvent.setup()
    renderAt('/admin/merchants')
    expect(await screen.findByRole('heading', { level: 1, name: 'Merchants' })).toBeInTheDocument()
    const queue = await screen.findByRole('list', { name: 'Waiting for review' })
    expect(screen.getByRole('tab', { name: /Waiting for review/, selected: true })).toHaveTextContent('(2)')
    expect(within(queue).getByRole('link', { name: /Kulot Studio/ })).toHaveAttribute(
      'href',
      '/admin/merchants/biz_kulot',
    )
    expect(within(queue).getByRole('link', { name: /Ritz Grooming Lounge/ })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Live/ }))
    const live = await screen.findByRole('list', { name: 'Live' })
    expect(within(live).getByRole('link', { name: /The Good Cut Barbershop/ })).toBeInTheDocument()
    expect(within(live).queryByRole('link', { name: /Kulot Studio/ })).not.toBeInTheDocument()
  })
})

describe('AdminMerchantReviewPage', () => {
  it('approves a listing with a reason, making it live', async () => {
    const user = userEvent.setup()
    renderAt('/admin/merchants/biz_kulot')
    expect(await screen.findByRole('heading', { level: 1, name: 'Kulot Studio' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Services' })).toHaveTextContent('Curly Cut')

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog', { name: 'Approve Kulot Studio?' })
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))
    expect(within(dialog).getByText('Give a reason of at least 5 characters')).toBeInTheDocument()

    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'Address and prices check out.')
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }))

    expect(await screen.findByText('Kulot Studio is live.')).toBeInTheDocument()
    const history = screen.getByRole('region', { name: 'History' })
    expect(within(history).getByText('Address and prices check out.')).toBeInTheDocument()
    expect(within(history).getByText(/Approved by Mika Santos/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument()
    await expect(shopsService.getShop('kulot-studio')).resolves.toMatchObject({ name: 'Kulot Studio' })
  })

  it('asks for changes, telling the owner why', async () => {
    const user = userEvent.setup()
    renderAt('/admin/merchants/biz_kulot')
    await user.click(await screen.findByRole('button', { name: 'Request changes' }))
    const dialog = await screen.findByRole('dialog', { name: 'Request changes to Kulot Studio?' })
    expect(within(dialog).getByText(/The owner sees this reason/)).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: 'Reason' }), 'Please add the street number.')
    await user.click(within(dialog).getByRole('button', { name: 'Request changes' }))

    expect(await screen.findByText('Sent back to Kulot Studio with your note.')).toBeInTheDocument()
    expect(screen.getByText('Changes requested')).toBeInTheDocument()
  })

  it('says so when the listing doesn’t exist', async () => {
    renderAt('/admin/merchants/biz_nope')
    expect(await screen.findByText('We couldn’t find that listing.')).toBeInTheDocument()
  })
})
