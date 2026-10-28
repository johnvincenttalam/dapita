import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import AdminCasePage from '@/routes/AdminCasePage'
import AdminOverviewPage from '@/routes/AdminOverviewPage'
import AdminReportsPage from '@/routes/AdminReportsPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const NOW = new Date('2026-10-21T03:00:00Z')
const CASE = 'case_conv_bea_polished'

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin', Component: AdminOverviewPage },
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
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.admin.id)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AdminReportsPage', () => {
  it('lists open reports with who and why', async () => {
    renderAt('/admin/reports')
    expect(await screen.findByRole('heading', { level: 1, name: 'Reports & cases' })).toBeInTheDocument()
    const open = await screen.findByRole('list', { name: 'Open' })
    const row = within(open).getByRole('link', { name: /Bea Villanueva/ })
    expect(row).toHaveTextContent('Polished Nail Studio')
    expect(row).toHaveTextContent('personal GCash number')
    expect(row).toHaveAttribute('href', `/admin/reports/${CASE}`)
  })
})

describe('AdminCasePage', () => {
  it('shows the conversation and works the case through to resolved', async () => {
    const user = userEvent.setup()
    renderAt(`/admin/reports/${CASE}`)
    const transcript = await screen.findByRole('log', { name: 'Conversation' })
    expect(within(transcript).getByText(/send a ₱300 deposit to my GCash/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Review the shop' })).toHaveAttribute(
      'href',
      '/admin/merchants/biz_polished',
    )

    await user.click(screen.getByRole('button', { name: 'Take case' }))
    expect(await screen.findByText('In progress')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'Messaged the shop about deposits.')
    await user.click(screen.getByRole('button', { name: 'Add note' }))
    const trail = screen.getByRole('region', { name: 'Audit trail' })
    expect(await within(trail).findByText('Messaged the shop about deposits.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'Shop now takes deposits in person only.')
    await user.click(screen.getByRole('button', { name: 'Resolve' }))
    expect(await screen.findByText('Case resolved.')).toBeInTheDocument()
    expect(within(trail).getByText(/Resolved by Mika Santos/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Take case' })).not.toBeInTheDocument()
  })
})

describe('AdminOverviewPage', () => {
  it('says what needs attention, linking to it', async () => {
    renderAt('/admin')
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /2 listings waiting for review/ })).toHaveAttribute(
      'href',
      '/admin/merchants',
    )
    expect(screen.getByRole('link', { name: /1 open report/ })).toHaveAttribute('href', '/admin/reports')
  })
})
