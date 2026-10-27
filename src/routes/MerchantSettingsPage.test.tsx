import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { merchantSettingsService } from '@/services/merchant-settings.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import MerchantSettingsPage from '@/routes/MerchantSettingsPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function renderPage() {
  const router = createMemoryRouter([{ path: '/business/settings', Component: MerchantSettingsPage }], {
    initialEntries: ['/business/settings'],
  })
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
})

describe('MerchantSettingsPage', () => {
  it('shows the owner’s account', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    const account = await screen.findByRole('region', { name: 'Your account' })
    expect(await within(account).findByRole('textbox', { name: /Your name/ })).toHaveValue('Paolo Mendoza')
    expect(within(account).getByText('owner@example.com')).toBeInTheDocument()
    expect(within(account).getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('saves which emails to get', async () => {
    const user = userEvent.setup()
    renderPage()
    const emails = await screen.findByRole('region', { name: 'Email notifications' })
    const summary = await within(emails).findByRole('switch', { name: 'Daily summary' })
    expect(summary).not.toBeChecked()
    expect(within(emails).getByRole('switch', { name: 'New booking requests' })).toBeChecked()

    await user.click(summary)
    await user.click(within(emails).getByRole('switch', { name: 'New messages' }))
    await user.click(within(emails).getByRole('button', { name: 'Save notifications' }))

    expect(await screen.findByText('Notification settings saved.')).toBeInTheDocument()
    expect(await merchantSettingsService.getNotificationSettings('biz_good_cut')).toMatchObject({
      dailySummary: true,
      newMessage: false,
    })
  })

  it('points to where the rest lives', async () => {
    renderPage()
    const more = await screen.findByRole('region', { name: 'More settings' })
    expect(within(more).getByRole('link', { name: /Hours, closures and policies/ })).toHaveAttribute(
      'href',
      '/business/profile?tab=hours',
    )
    expect(within(more).getByRole('link', { name: /Agreements, your data and account deletion/ })).toHaveAttribute(
      'href',
      '/account/privacy',
    )
  })
})
