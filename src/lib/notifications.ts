import { formatAppointment } from '@/lib/format'
import type { CaseListItem, MerchantListItem } from '@/types/admin'
import type { BookingDetails } from '@/types/booking'
import type { ConversationSummary } from '@/types/message'

export type NotificationAudience = 'customer' | 'merchant' | 'admin'

export interface AppNotification {
  /** Includes the time of the thing it's about, so something newer alerts again after a dismissal. */
  id: string
  title: string
  body: string
  href: string
  occurredAt: string
  read: boolean
}

export type NotificationSources =
  | { audience: 'customer'; conversations: ConversationSummary[]; bookings: BookingDetails[] }
  | { audience: 'merchant'; conversations: ConversationSummary[]; bookings: BookingDetails[] }
  | { audience: 'admin'; merchants: MerchantListItem[]; cases: CaseListItem[] }

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

function messageAlerts(conversations: ConversationSummary[], href: (id: string) => string) {
  return conversations
    .filter((conversation) => conversation.unreadCount > 0)
    .map((conversation) => {
      const from = conversation.viewerSide === 'customer' ? conversation.business.name : conversation.customer.name
      const count = conversation.unreadCount
      return {
        id: `msg:${conversation.id}:${conversation.lastMessageAt}`,
        title: count > 1 ? `${count} new messages from ${from}` : `New message from ${from}`,
        body: oneLine(conversation.lastMessage?.body ?? ''),
        href: href(conversation.id),
        occurredAt: conversation.lastMessageAt,
      }
    })
}

/**
 * The bell's contents, built from what is actually waiting for this person (no sample items).
 * Each one goes away once it's dealt with: the conversation read, the request answered,
 * the listing reviewed. `dismissed` holds ids marked read without opening them.
 */
export function buildNotifications(sources: NotificationSources, dismissed: ReadonlySet<string>): AppNotification[] {
  let items: Omit<AppNotification, 'read'>[]
  if (sources.audience === 'customer') {
    items = [
      ...messageAlerts(sources.conversations, (id) => `/inbox/${encodeURIComponent(id)}`),
      ...sources.bookings
        .filter((booking) => booking.status === 'alternative_proposed' && booking.proposal)
        .map((booking) => ({
          id: `alt:${booking.id}:${booking.proposal?.proposedAt}`,
          title: 'New time proposed',
          body: `${booking.business.name} suggested ${formatAppointment(booking.proposal?.start ?? booking.start)} for your ${booking.service.name}.`,
          href: `/bookings/${encodeURIComponent(booking.id)}`,
          occurredAt: booking.proposal?.proposedAt ?? booking.updatedAt,
        })),
    ]
  } else if (sources.audience === 'merchant') {
    items = [
      ...messageAlerts(sources.conversations, (id) => `/business/messages/${encodeURIComponent(id)}`),
      ...sources.bookings
        .filter((booking) => booking.status === 'pending')
        .map((booking) => ({
          id: `req:${booking.id}`,
          title: 'New booking request',
          body: `${booking.contact.name} requested ${booking.service.name} for ${formatAppointment(booking.start)}.`,
          href: `/business/bookings/${encodeURIComponent(booking.id)}`,
          occurredAt: booking.createdAt,
        })),
    ]
  } else {
    items = [
      ...sources.merchants
        .filter((merchant) => merchant.status === 'pending_review')
        .map((merchant) => ({
          id: `listing:${merchant.id}:${merchant.updatedAt}`,
          title: 'Listing waiting for review',
          body: `${merchant.name} submitted its listing.`,
          href: `/admin/merchants/${encodeURIComponent(merchant.id)}`,
          occurredAt: merchant.updatedAt,
        })),
      ...sources.cases
        .filter((item) => item.status === 'open')
        .map((item) => ({
          id: `case:${item.id}`,
          title: 'Conversation reported',
          body: `${item.customerName} and ${item.businessName}: “${oneLine(item.reason)}”`,
          href: `/admin/reports/${encodeURIComponent(item.id)}`,
          occurredAt: item.createdAt,
        })),
    ]
  }
  return items
    .map((item) => ({ ...item, read: dismissed.has(item.id) }))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 20)
}
