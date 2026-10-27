import { describe, expect, it } from 'vitest'

import { zonedDateTime } from '@/lib/datetime'
import { messageDays, messagePreview } from '@/lib/messaging'
import type { Message } from '@/types/message'

// Wednesday 21 Oct 2026, 11:00 in Manila.
const NOW = new Date('2026-10-21T03:00:00Z')
const at = (date: string, time: string) => zonedDateTime(date, time).toISOString()

const message = (id: string, sentAt: string, senderRole: Message['senderRole'] = 'customer'): Message => ({
  id,
  conversationId: 'conv_1',
  senderId: 'usr_x',
  senderRole,
  body: id,
  sentAt,
})

describe('messageDays', () => {
  it('groups messages under Today, Yesterday or the date, in Davao time', () => {
    const days = messageDays(
      [
        message('a', at('2026-10-19', '09:00')),
        message('b', at('2026-10-20', '23:30')),
        message('c', at('2026-10-21', '00:10')),
        message('d', at('2026-10-21', '10:00')),
      ],
      NOW,
    )
    expect(days.map((day) => [day.label, day.messages.map((m) => m.id)])).toEqual([
      ['Mon, Oct 19', ['a']],
      ['Yesterday', ['b']],
      ['Today', ['c', 'd']],
    ])
  })
})

describe('messagePreview', () => {
  it('marks the viewer’s own last message and keeps it to one line', () => {
    expect(messagePreview({ body: 'See you\nFriday', senderRole: 'business', sentAt: '' }, 'business')).toBe(
      'You: See you Friday',
    )
    expect(messagePreview({ body: 'Hi', senderRole: 'customer', sentAt: '' }, 'business')).toBe('Hi')
    expect(messagePreview(undefined, 'customer')).toBe('No messages yet')
  })
})
