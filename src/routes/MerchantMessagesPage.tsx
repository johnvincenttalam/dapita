import { useParams } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { useCurrentBusinessId } from '@/features/booking/api/merchant-queries'
import { useBusinessConversationsQuery } from '@/features/messaging/api/queries'
import { MessagingWorkspace } from '@/features/messaging/components/MessagingWorkspace'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/utils'

/** Customer messages to the shop (MER-05): `/business/messages` and `/business/messages/:conversationId`. */
export default function MerchantMessagesPage() {
  useDocumentTitle('Messages')
  const { conversationId } = useParams()
  const conversations = useBusinessConversationsQuery(useCurrentBusinessId())

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Questions from customers. Quick replies help people decide to book."
        className={cn(conversationId && 'max-lg:hidden')}
      />
      <MessagingWorkspace
        conversations={conversations}
        conversationId={conversationId}
        basePath="/business/messages"
        bookingHref={(id) => `/business/bookings/${encodeURIComponent(id)}`}
        empty={{
          title: 'No messages yet',
          description: 'When customers message your shop, their questions appear here.',
        }}
      />
    </div>
  )
}
