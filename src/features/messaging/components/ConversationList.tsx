import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelative, initials } from '@/lib/format'
import { messagePreview, otherParty } from '@/lib/messaging'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/types/message'

interface ConversationListProps {
  conversations: ConversationSummary[]
  selectedId?: string
  hrefFor: (id: string) => string
  now: Date
  label: string
}

/** Conversations, newest first. Unread ones are bold with a count; nothing relies on colour alone. */
export function ConversationList({ conversations, selectedId, hrefFor, now, label }: ConversationListProps) {
  return (
    <ul aria-label={label} className="divide-y divide-border/70 overflow-hidden rounded-3xl card-surface">
      {conversations.map((conversation) => {
        const name = otherParty(conversation)
        const unread = conversation.unreadCount
        const photo = conversation.viewerSide === 'customer' ? conversation.business.coverPhotoUrl : undefined
        return (
          <li key={conversation.id}>
            <Link
              to={hrefFor(conversation.id)}
              id={`conversation-row-${conversation.id}`}
              aria-current={conversation.id === selectedId ? 'true' : undefined}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 transition-colors outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
                conversation.id === selectedId && 'bg-accent hover:bg-accent',
              )}
            >
              <Avatar className="size-11 shrink-0">
                {photo ? <AvatarImage src={photo} alt="" className="object-cover" /> : null}
                <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn('truncate', unread ? 'font-semibold' : 'font-medium')}>{name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(conversation.lastMessageAt, now)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={cn('truncate text-sm', unread ? 'text-foreground' : 'text-muted-foreground')}>
                    {messagePreview(conversation.lastMessage, conversation.viewerSide)}
                  </span>
                  {unread ? (
                    <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 type-micro text-primary-foreground tabular-nums">
                      {unread}
                      <span className="sr-only"> unread</span>
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
