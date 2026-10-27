import { describe, expect, it } from 'vitest'

import { buildNotifications } from '@/lib/notifications'
import type { CaseListItem, MerchantListItem } from '@/types/admin'
import type { BookingDetails } from '@/types/booking'
import type { ConversationSummary } from '@/types/message'

const conversation = (overrides: Partial<ConversationSummary>): ConversationSummary => ({
  id: 'conv_1',
  viewerSide: 'customer',
  business: { id: 'biz_1', slug: 'serenity', name: 'Serenity Wellness Spa' },
  customer: { id: 'usr_1', name: 'Andrea Reyes' },
  lastMessage: {
    body: 'Hi Andrea!\nJoy will look after you.',
    sentAt: '2026-10-21T02:00:00.000Z',
    senderRole: 'business',
  },
  unreadCount: 1,
  reported: false,
  lastMessageAt: '2026-10-21T02:00:00.000Z',
  ...overrides,
})

const booking = (overrides: Partial<BookingDetails>) =>
  ({
    id: 'bk_1',
    status: 'pending',
    start: '2026-10-23T06:00:00.000Z',
    createdAt: '2026-10-21T01:00:00.000Z',
    contact: { name: 'Carlos Tan', email: 'c@example.com' },
    service: { name: 'Haircut & Styling', durationMinutes: 60, price: { type: 'fixed', amount: 450 } },
    business: { id: 'biz_1', slug: 'good-cut', name: 'The Good Cut', address: '', areaName: '' },
    ...overrides,
  }) as BookingDetails

describe('buildNotifications', () => {
  it('tells a customer about unread messages and times to answer, newest first', () => {
    const items = buildNotifications(
      {
        audience: 'customer',
        conversations: [conversation({}), conversation({ id: 'conv_2', unreadCount: 0 })],
        bookings: [
          booking({
            id: 'bk_alt',
            status: 'alternative_proposed',
            business: { id: 'biz_1', slug: 's', name: 'Serenity Wellness Spa', address: '', areaName: '' },
            service: { name: 'Swedish Massage', durationMinutes: 60, price: { type: 'quote' } },
            proposal: {
              start: '2026-10-25T11:30:00.000Z',
              end: '2026-10-25T12:30:00.000Z',
              proposedAt: '2026-10-21T02:30:00.000Z',
            },
          }),
          booking({ id: 'bk_pending' }),
        ],
      },
      new Set(),
    )
    expect(items.map((item) => [item.title, item.href, item.read])).toEqual([
      ['New time proposed', '/bookings/bk_alt', false],
      ['New message from Serenity Wellness Spa', '/inbox/conv_1', false],
    ])
    expect(items[1]?.body).toBe('Hi Andrea! Joy will look after you.')
  })

  it('tells a shop about requests and messages from customers', () => {
    const items = buildNotifications(
      {
        audience: 'merchant',
        conversations: [
          conversation({ viewerSide: 'business', unreadCount: 2, lastMessageAt: '2026-10-21T00:00:00.000Z' }),
        ],
        bookings: [booking({}), booking({ id: 'bk_done', status: 'confirmed' })],
      },
      new Set(),
    )
    expect(items.map((item) => [item.title, item.href])).toEqual([
      ['New booking request', '/business/bookings/bk_1'],
      ['2 new messages from Andrea Reyes', '/business/messages/conv_1'],
    ])
    expect(items[0]?.body).toMatch(/^Carlos Tan requested Haircut & Styling for /)
  })

  it('tells an admin what is waiting', () => {
    const items = buildNotifications(
      {
        audience: 'admin',
        merchants: [
          { id: 'biz_k', name: 'Kulot Studio', status: 'pending_review', updatedAt: '2026-10-20T00:00:00.000Z' },
          { id: 'biz_g', name: 'Good Cut', status: 'approved', updatedAt: '2026-10-21T00:00:00.000Z' },
        ] as MerchantListItem[],
        cases: [
          {
            id: 'case_1',
            status: 'open',
            customerName: 'Bea',
            businessName: 'Polished',
            reason: 'Asked for a GCash deposit.',
            createdAt: '2026-10-21T00:00:00.000Z',
          },
        ] as CaseListItem[],
      },
      new Set(),
    )
    expect(items.map((item) => [item.title, item.href])).toEqual([
      ['Conversation reported', '/admin/reports/case_1'],
      ['Listing waiting for review', '/admin/merchants/biz_k'],
    ])
  })

  it('marks dismissed items read, until something newer arrives', () => {
    const input = { audience: 'customer' as const, conversations: [conversation({})], bookings: [] }
    const [item] = buildNotifications(input, new Set())
    expect(buildNotifications(input, new Set([item?.id ?? '']))[0]?.read).toBe(true)

    const newer = { ...input, conversations: [conversation({ lastMessageAt: '2026-10-21T05:00:00.000Z' })] }
    expect(buildNotifications(newer, new Set([item?.id ?? '']))[0]?.read).toBe(false)
  })
})
