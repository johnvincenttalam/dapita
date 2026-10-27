import { ScrollTextIcon } from 'lucide-react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useDocumentTitle } from '@/hooks/use-document-title'

/**
 * Logs (ADM-05): notification and system failures. Nothing sends emails or texts in the
 * prototype, so there is nothing to fail; the page says so rather than showing sample rows.
 */
export default function AdminLogsPage() {
  useDocumentTitle('Logs')
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Logs" description="Failed notifications and system errors." />
      <EmptyState
        icon={ScrollTextIcon}
        title="No failures recorded"
        description="Email and text delivery aren’t connected in this prototype, so nothing can fail yet. Failed deliveries will be listed here with the time and kind of message, never the message itself."
        bordered
      />
    </div>
  )
}
