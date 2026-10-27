import { ArrowRightIcon, MessageCircleIcon } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/format'
import { messagePreview } from '@/lib/messaging'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/types/message'

const shown = 4

/** "Recent messages" (design screen 12): unread conversations first, then the newest. */
export function RecentMessagesPanel({ conversations, now }: { conversations: ConversationSummary[]; now: Date }) {
  const recent = [...conversations]
    .sort(
      (a, b) => Number(b.unreadCount > 0) - Number(a.unreadCount > 0) || b.lastMessageAt.localeCompare(a.lastMessageAt),
    )
    .slice(0, shown)
  const unread = conversations.filter((conversation) => conversation.unreadCount > 0).length

  return (
    <Panel
      title="Recent messages"
      description={
        unread ? `${unread} ${unread === 1 ? 'conversation needs' : 'conversations need'} a reply.` : undefined
      }
    >
      {recent.length === 0 ? (
        <EmptyState
          icon={MessageCircleIcon}
          title="No messages yet"
          description="Questions from customers show up here."
          className="py-6"
        />
      ) : (
        <ul className="-mx-2 divide-y divide-border/70">
          {recent.map((conversation) => (
            <li key={conversation.id}>
              <Link
                to={`/business/messages/${encodeURIComponent(conversation.id)}`}
                className="block rounded-xl px-2 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className={cn('truncate', conversation.unreadCount ? 'font-semibold' : 'font-medium')}>
                    {conversation.customer.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(conversation.lastMessageAt, now)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-muted-foreground">
                    {messagePreview(conversation.lastMessage, 'business')}
                  </span>
                  {conversation.unreadCount ? (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 type-micro text-primary-foreground tabular-nums">
                      {conversation.unreadCount}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end border-t border-border/70 pt-4">
        <Button asChild variant="ghost" shape="pill" size="sm" className="-mr-2">
          <Link to="/business/messages">
            All messages
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Panel>
  )
}
