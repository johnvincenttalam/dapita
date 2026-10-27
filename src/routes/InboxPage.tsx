import { Link, useParams } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useMyConversationsQuery } from '@/features/messaging/api/queries'
import { MessagingWorkspace } from '@/features/messaging/components/MessagingWorkspace'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/utils'

/** The customer's conversations with shops (§9.1 Messages): `/inbox` and `/inbox/:conversationId`. */
export default function InboxPage() {
  useDocumentTitle('Inbox')
  const { conversationId } = useParams()
  const conversations = useMyConversationsQuery()

  return (
    <div className="space-y-6">
      {/* On phones an open conversation has its own back header instead. */}
      <PageHeader
        title="Inbox"
        description="Ask shops about prices, times and anything else."
        className={cn(conversationId && 'max-lg:hidden')}
      />
      <MessagingWorkspace
        conversations={conversations}
        conversationId={conversationId}
        basePath="/inbox"
        bookingHref={(id) => `/bookings/${encodeURIComponent(id)}`}
        empty={{
          title: 'No messages yet',
          description: 'Message a shop from its page or from one of your bookings.',
          action: (
            <Button asChild shape="pill">
              <Link to="/explore">Find a shop</Link>
            </Button>
          ),
        }}
      />
    </div>
  )
}
