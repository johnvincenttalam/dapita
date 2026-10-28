import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import AdminCasePage from '@/routes/AdminCasePage'
import AdminReportsPage from '@/routes/AdminReportsPage'
import LegalPage from '@/routes/LegalPage'
import SupportPage from '@/routes/SupportPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const NOW = new Date('2026-10-21T03:00:00Z')

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/support', Component: SupportPage },
      { path: '/legal/terms', Component: LegalPage },
      { path: '/legal/privacy', Component: LegalPage },
      { path: '/admin/reports', Component: AdminReportsPage },
      { path: '/admin/reports/:caseId', Component: AdminCasePage },
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
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('SupportPage', () => {
  it('asks guests to sign in, coming back to the same form', async () => {
    localStorage.removeItem(MOCK_SESSION_KEY)
    renderAt('/support?topic=account')
    expect(await screen.findByRole('heading', { name: 'Sign in to contact support' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/auth/sign-in?next=${encodeURIComponent('/support?topic=account')}`,
    )
  })

  it('sends a request about a booking, which staff then see', async () => {
    const user = userEvent.setup()
    const router = renderAt('/support?topic=booking&booking=bk_andrea_completed')
    expect(await screen.findByRole('radio', { name: 'A booking' })).toBeChecked()
    expect(screen.getByRole('combobox', { name: /Which booking/ })).toHaveValue('bk_andrea_completed')

    await user.click(screen.getByRole('button', { name: 'Send to support' }))
    expect(await screen.findByText('Tell us what happened in at least 10 characters')).toBeInTheDocument()

    await user.type(
      screen.getByRole('textbox', { name: /What happened/ }),
      'The shop charged ₱200 more than the listed price.',
    )
    await user.click(screen.getByRole('button', { name: 'Send to support' }))
    expect(await screen.findByRole('heading', { name: 'Request sent' })).toBeInTheDocument()
    expect(screen.getByText('customer@example.com')).toBeInTheDocument()

    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.admin.id)
    await router.navigate('/admin/reports')
    const open = await screen.findByRole('list', { name: 'Open' })
    await user.click(within(open).getByRole('link', { name: /Booking at Polished Nail Studio/ }))
    const request = await screen.findByRole('region', { name: 'Request' })
    expect(request).toHaveTextContent('The shop charged ₱200 more than the listed price.')
    expect(within(request).getByText('DP-2HF6NC')).toBeInTheDocument()
    expect(within(request).getByRole('link', { name: 'customer@example.com' })).toHaveAttribute(
      'href',
      'mailto:customer@example.com',
    )
  })

  it('reports the shop it was opened from', async () => {
    const user = userEvent.setup()
    renderAt('/support?topic=listing&shop=the-good-cut-barbershop')
    expect(await screen.findByText(/The Good Cut Barbershop/)).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: /What happened/ }), 'The haircut price is out of date.')
    await user.click(screen.getByRole('button', { name: 'Send to support' }))
    expect(await screen.findByRole('heading', { name: 'Request sent' })).toBeInTheDocument()
  })

  it('explains how to report a listing when no shop was given', async () => {
    const user = userEvent.setup()
    renderAt('/support')
    await user.click(await screen.findByRole('radio', { name: 'A shop’s listing' }))
    expect(screen.getByRole('status')).toHaveTextContent('open its page and choose Report this listing')
    expect(screen.queryByRole('button', { name: 'Send to support' })).not.toBeInTheDocument()
  })
})

describe('LegalPage', () => {
  it('shows the document for the address, marked as a draft, with links to the others', async () => {
    renderAt('/legal/privacy')
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy notice' })).toBeInTheDocument()
    expect(screen.getByText('Draft for review')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Your rights' })).toBeInTheDocument()
    const others = screen.getByRole('navigation', { name: 'Other policies' })
    expect(within(others).getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/legal/terms')
  })
})
