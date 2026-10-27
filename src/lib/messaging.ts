import { addDays, toDateKey, zonedDateTime } from '@/lib/datetime'
import { formatDay } from '@/lib/format'
import type { DateKey } from '@/types/common'
import type { ConversationSide, ConversationSummary, Message } from '@/types/message'

/** "Today", "Yesterday" or "Mon, Oct 19", in the market time zone. */
function dayLabel(day: DateKey, now: Date) {
  const today = toDateKey(now)
  if (day === today) return 'Today'
  if (day === addDays(today, -1)) return 'Yesterday'
  return formatDay(zonedDateTime(day, '12:00'))
}

/** A thread split by day, for the dividers between days. Messages arrive in time order. */
export function messageDays(messages: Message[], now: Date): { key: DateKey; label: string; messages: Message[] }[] {
  const days: { key: DateKey; label: string; messages: Message[] }[] = []
  for (const message of messages) {
    const key = toDateKey(new Date(message.sentAt))
    const last = days.at(-1)
    if (last?.key === key) last.messages.push(message)
    else days.push({ key, label: dayLabel(key, now), messages: [message] })
  }
  return days
}

/** The last message on one line, marked "You:" when the viewer sent it. */
export function messagePreview(
  last: Pick<Message, 'body' | 'senderRole' | 'sentAt'> | undefined,
  viewer: ConversationSide,
): string {
  if (!last) return 'No messages yet'
  const text = last.body.replace(/\s+/g, ' ').trim()
  return last.senderRole === viewer ? `You: ${text}` : text
}

/** Who the viewer is talking to: the shop for a customer, the customer for a shop. */
export const otherParty = (conversation: Pick<ConversationSummary, 'viewerSide' | 'business' | 'customer'>) =>
  conversation.viewerSide === 'customer' ? conversation.business.name : conversation.customer.name
