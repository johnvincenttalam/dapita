import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/lib/query-client'
import { conversationsService } from '@/services/conversations.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'
import InboxPage from '@/routes/InboxPage'
import MerchantMessagesPage from '@/routes/MerchantMessagesPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')

function renderAt(path: string, account: MockAccount) {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  const router = createMemoryRouter(
    [
      { path: '/inbox', Component: InboxPage },
      { path: '/inbox/:conversationId', Component: InboxPage },
      { path: '/business/messages', Component: MerchantMessagesPage },
      { path: '/business/messages/:conversationId', Component: MerchantMessagesPage },
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
})

afterEach(() => {
  vi.useRealTimers()
})

describe('InboxPage (customer)', () => {
  it('lists conversations and reads one, clearing its unread count', async () => {
    const user = userEvent.setup()
    renderAt('/inbox', 'customer')
    expect(await screen.findByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Conversations' })
    const serenity = within(list).getByRole('link', { name: /Serenity Wellness Spa/ })
    expect(serenity).toHaveTextContent('1 unread')

    await user.click(serenity)
    const thread = await screen.findByRole('article', { name: 'Conversation with Serenity Wellness Spa' })
    expect(within(thread).getByText(/Joy will look after you/)).toBeInTheDocument()
    await waitFor(() => expect(within(list).getByRole('link', { name: /Serenity/ })).not.toHaveTextContent('unread'))
  })

  it('sends a message with Enter and keeps a new line with Shift+Enter', async () => {
    const user = userEvent.setup()
    renderAt('/inbox/conv_andrea_goodcut', 'customer')
    const box = await screen.findByRole('textbox', { name: 'Message' })
    await user.type(box, 'Also, can I bring{Shift>}{Enter}{/Shift}my own clips?{Enter}')

    const log = screen.getByRole('log', { name: 'Messages' })
    expect(await within(log).findByText(/my own clips\?/)).toBeInTheDocument()
    expect(box).toHaveValue('')
    const thread = await conversationsService.getConversation('conv_andrea_goodcut')
    expect(thread.messages.at(-1)?.body).toBe('Also, can I bring\nmy own clips?')
  })

  it('shows the booking a conversation is about', async () => {
    renderAt('/inbox/conv_andrea_goodcut', 'customer')
    const thread = await screen.findByRole('article', { name: 'Conversation with The Good Cut Barbershop' })
    expect(within(thread).getByRole('link', { name: /Haircut & Styling/ })).toHaveAttribute(
      'href',
      '/bookings/bk_andrea_pending',
    )
  })

  it('reports a conversation with a reason', async () => {
    const user = userEvent.setup()
    renderAt('/inbox/conv_andrea_serenity', 'customer')
    await user.click(await screen.findByRole('button', { name: 'Conversation options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Report conversation' }))
    const dialog = await screen.findByRole('dialog', { name: 'Report this conversation?' })
    await user.click(within(dialog).getByRole('button', { name: 'Send report' }))
    expect(within(dialog).getByText('Tell us what happened in at least 5 characters')).toBeInTheDocument()

    await user.type(within(dialog).getByRole('textbox', { name: 'What happened?' }), 'Asked me to pay outside the app.')
    await user.click(within(dialog).getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText('Thanks. Our team will review this conversation.')).toBeInTheDocument()
    expect(await screen.findByText(/This conversation was reported/)).toBeInTheDocument()
  })

  it('says so when the conversation isn’t yours', async () => {
    renderAt('/inbox/conv_carlos_goodcut', 'customer')
    expect(await screen.findByText('We couldn’t find that conversation.')).toBeInTheDocument()
  })
})

describe('MerchantMessagesPage', () => {
  it('lets the shop read and answer customers', async () => {
    const user = userEvent.setup()
    renderAt('/business/messages', 'merchant')
    expect(await screen.findByRole('heading', { level: 1, name: 'Messages' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Conversations' })
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([expect.stringMatching(/Andrea Reyes.*1 unread/), expect.stringMatching(/Carlos Tan.*1 unread/)])

    await user.click(within(list).getByRole('link', { name: /Andrea Reyes/ }))
    const thread = await screen.findByRole('article', { name: 'Conversation with Andrea Reyes' })
    expect(within(thread).getByRole('link', { name: /Haircut & Styling/ })).toHaveAttribute(
      'href',
      '/business/bookings/bk_andrea_pending',
    )
    await user.type(within(thread).getByRole('textbox', { name: 'Message' }), 'Yes, Ken does great layers!{Enter}')
    const log = within(thread).getByRole('log', { name: 'Messages' })
    expect(await within(log).findByText('Yes, Ken does great layers!')).toBeInTheDocument()

    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    const [latest] = await conversationsService.listMyConversations()
    expect(latest).toMatchObject({ id: 'conv_andrea_goodcut', unreadCount: 1 })
  })
})
