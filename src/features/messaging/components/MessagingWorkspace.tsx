import type { UseQueryResult } from '@tanstack/react-query'
import { MessageCircleIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useConversationQuery } from '@/features/messaging/api/queries'
import { ConversationList } from '@/features/messaging/components/ConversationList'
import { MessageThread } from '@/features/messaging/components/MessageThread'
import { useNow } from '@/hooks/use-now'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/types/message'

interface MessagingWorkspaceProps {
  conversations: UseQueryResult<ConversationSummary[]>
  /** The open conversation, from the URL. */
  conversationId?: string
  /** `/inbox` or `/business/messages`. */
  basePath: string
  bookingHref: (id: string) => string
  empty: { title: string; description: string; action?: ReactNode }
}

/**
 * The inbox for either side. From `lg` the list and the open conversation sit side by side;
 * below it they are separate screens, like the merchant Bookings page. Nothing opens until
 * chosen, because opening a conversation marks it read.
 */
export function MessagingWorkspace({
  conversations,
  conversationId,
  basePath,
  bookingHref,
  empty,
}: MessagingWorkspaceProps) {
  const now = useNow()
  const detail = useConversationQuery(conversationId)
  const hrefFor = (id: string) => `${basePath}/${encodeURIComponent(id)}`
  const notFound = detail.error instanceof ApiError && detail.error.status === 404

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className={cn('min-w-0', conversationId && 'hidden lg:block')}>
        {conversations.isPending ? (
          <Skeleton aria-hidden="true" className="h-80 rounded-3xl" />
        ) : conversations.isError ? (
          <ErrorState
            error={conversations.error}
            onRetry={() => void conversations.refetch()}
            isRetrying={conversations.isRefetching}
          />
        ) : conversations.data.length === 0 ? (
          <EmptyState icon={MessageCircleIcon} bordered {...empty} />
        ) : (
          <ConversationList
            conversations={conversations.data}
            selectedId={conversationId}
            hrefFor={hrefFor}
            now={now}
            label="Conversations"
          />
        )}
      </div>

      <div className={cn('min-w-0', !conversationId && 'hidden lg:block')}>
        {!conversationId ? (
          <div className="flex h-[min(46rem,calc(100svh-13rem))] min-h-96 items-center justify-center rounded-3xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Choose a conversation to read it here.</p>
          </div>
        ) : notFound ? (
          <ErrorState
            title="We couldn’t find that conversation."
            description="It may belong to another account, or the link is wrong."
            action={
              <Button asChild variant="outline" shape="pill">
                <Link to={basePath}>All messages</Link>
              </Button>
            }
          />
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} isRetrying={detail.isRefetching} />
        ) : !detail.data ? (
          <Skeleton aria-hidden="true" className="h-[min(46rem,calc(100svh-13rem))] min-h-96 rounded-3xl" />
        ) : (
          <MessageThread
            key={detail.data.id}
            conversation={detail.data}
            now={now}
            backHref={basePath}
            bookingHref={bookingHref}
          />
        )}
      </div>
    </div>
  )
}
