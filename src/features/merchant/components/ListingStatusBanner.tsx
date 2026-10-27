import { InfoIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { Alert, AlertDescription } from '@/components/ui/alert'
import type { BusinessStatus } from '@/types/business'

const messages: Partial<Record<BusinessStatus, { text: string; link?: { to: string; label: string } }>> = {
  draft: {
    text: 'Your shop isn’t live yet. Finish your listing so customers can find and book you.',
    link: { to: '/business/onboarding', label: 'Continue setup' },
  },
  pending_review: {
    text: 'Your listing is waiting for review. Customers can’t see it until Dapita approves it.',
  },
  changes_requested: {
    text: 'Dapita asked for changes to your listing before it can go live.',
    link: { to: '/business/onboarding', label: 'Make changes' },
  },
  suspended: {
    text: 'Your listing is suspended, so customers can’t see or book it.',
    link: { to: '/support', label: 'Contact support' },
  },
  rejected: {
    text: 'Your listing wasn’t approved.',
    link: { to: '/support', label: 'Contact support' },
  },
}

/**
 * Why the shop isn't public yet (plan §8 #5), above every merchant page except the setup
 * itself, which says the same thing in more detail. Nothing shows once the listing is live.
 */
export function ListingStatusBanner({ status, note }: { status: BusinessStatus; note?: string }) {
  const { pathname } = useLocation()
  const message = messages[status]
  if (!message || pathname.startsWith('/business/onboarding')) return null

  return (
    <Alert variant="info" role="status" className="mb-6">
      <InfoIcon aria-hidden="true" />
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          {message.text}
          {note ? <span className="font-medium"> “{note}”</span> : null}
        </span>
        {message.link ? (
          <Link to={message.link.to} className="font-medium text-foreground underline underline-offset-4">
            {message.link.label}
          </Link>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
