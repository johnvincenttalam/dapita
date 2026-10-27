import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { conversationsService } from '@/services/conversations.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')

function signInAs(account: MockAccount | null) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  else localStorage.removeItem(MOCK_SESSION_KEY)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('conversations (mock service)', () => {
  it('lists the customer’s conversations, newest first, with what they haven’t read', async () => {
    signInAs('customer')
    const list = await conversationsService.listMyConversations()
    expect(list.map((c) => [c.business.name, c.unreadCount, c.viewerSide])).toEqual([
      ['The Good Cut Barbershop', 0, 'customer'],
      ['Serenity Wellness Spa', 1, 'customer'],
    ])
    expect(list[0]?.booking).toMatchObject({ id: 'bk_andrea_pending', serviceName: 'Haircut & Styling' })
  })

  it('lists a business’s conversations for its members only', async () => {
    signInAs('merchant')
    const list = await conversationsService.listBusinessConversations('biz_good_cut')
    expect(list.map((c) => [c.customer.name, c.unreadCount, c.viewerSide])).toEqual([
      ['Andrea Reyes', 1, 'business'],
      ['Carlos Tan', 1, 'business'],
    ])
    await expect(conversationsService.listBusinessConversations('biz_serenity')).rejects.toMatchObject({ status: 403 })
    signInAs('customer')
    await expect(conversationsService.listBusinessConversations('biz_good_cut')).rejects.toMatchObject({ status: 403 })
  })

  it('hides conversations from anyone outside them', async () => {
    signInAs('merchant')
    await expect(conversationsService.getConversation('conv_andrea_serenity')).rejects.toMatchObject({ status: 404 })
    signInAs(null)
    await expect(conversationsService.getConversation('conv_andrea_goodcut')).rejects.toMatchObject({ status: 401 })
  })

  it('carries a message from the customer to the shop and back', async () => {
    signInAs('customer')
    await conversationsService.sendMessage('conv_andrea_goodcut', '  Also, can I bring my own hair clips?  ')

    signInAs('merchant')
    const inbox = await conversationsService.listBusinessConversations('biz_good_cut')
    expect(inbox[0]).toMatchObject({ id: 'conv_andrea_goodcut', unreadCount: 2 })
    const thread = await conversationsService.getConversation('conv_andrea_goodcut')
    expect(thread.messages.at(-1)).toMatchObject({
      senderRole: 'customer',
      body: 'Also, can I bring my own hair clips?',
    })
    await conversationsService.markRead('conv_andrea_goodcut')
    await conversationsService.sendMessage('conv_andrea_goodcut', 'Of course, see you Friday!')

    signInAs('customer')
    const [latest] = await conversationsService.listMyConversations()
    expect(latest).toMatchObject({
      id: 'conv_andrea_goodcut',
      unreadCount: 1,
      lastMessage: { body: 'Of course, see you Friday!', senderRole: 'business' },
    })
    signInAs('merchant')
    expect((await conversationsService.listBusinessConversations('biz_good_cut'))[0]?.unreadCount).toBe(0)
  })

  it('rejects an empty or overlong message', async () => {
    signInAs('customer')
    await expect(conversationsService.sendMessage('conv_andrea_goodcut', '   ')).rejects.toMatchObject({
      status: 422,
      message: 'Write a message',
    })
    await expect(conversationsService.sendMessage('conv_andrea_goodcut', 'x'.repeat(2001))).rejects.toMatchObject({
      status: 422,
    })
  })

  it('starts one conversation per shop, reusing it the next time', async () => {
    signInAs('customer')
    const started = await conversationsService.startConversation({ businessId: 'biz_glow_go' })
    expect(started).toMatchObject({ business: { name: 'Glow & Go Beauty Salon' }, unreadCount: 0 })
    expect((await conversationsService.getConversation(started.id)).messages).toEqual([])

    const again = await conversationsService.startConversation({
      businessId: 'biz_good_cut',
      bookingId: 'bk_andrea_pending',
    })
    expect(again.id).toBe('conv_andrea_goodcut')
  })

  it('only lets customers start conversations, about their own bookings', async () => {
    signInAs('merchant')
    // The owner's account can book as a customer, but not with their own shop.
    await expect(conversationsService.startConversation({ businessId: 'biz_good_cut' })).rejects.toMatchObject({
      status: 422,
    })
    signInAs('customer')
    await expect(
      conversationsService.startConversation({ businessId: 'biz_good_cut', bookingId: 'bk_gc_john' }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('records a report and keeps the conversation readable', async () => {
    signInAs('customer')
    await expect(conversationsService.reportConversation('conv_andrea_serenity', 'no')).rejects.toMatchObject({
      status: 422,
    })
    await conversationsService.reportConversation('conv_andrea_serenity', 'They asked me to pay outside the app.')
    expect(await conversationsService.getConversation('conv_andrea_serenity')).toMatchObject({ reported: true })
  })
})
