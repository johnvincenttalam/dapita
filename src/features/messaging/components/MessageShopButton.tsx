import { MessageCircleIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/api/queries'
import { signInHref } from '@/features/auth/links'
import { useStartConversationMutation } from '@/features/messaging/api/queries'
import { hasAnyRole } from '@/lib/roles'
import { cn } from '@/lib/utils'

interface MessageShopButtonProps {
  businessId: string
  /** Shown to the shop as what the conversation is about. */
  bookingId?: string
  fullWidth?: boolean
  className?: string
}

/**
 * Opens the customer's thread with a shop (designs 7 and 11, "Message shop"). Guests sign in
 * first and come back here; the shop's own team, and admins, don't see it.
 */
export function MessageShopButton({ businessId, bookingId, fullWidth, className }: MessageShopButtonProps) {
  const { user, isPending } = useSession()
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const start = useStartConversationMutation()

  if (isPending) return null
  const content = (
    <>
      <MessageCircleIcon aria-hidden="true" />
      Message shop
    </>
  )
  if (!user) {
    return (
      <Button asChild variant="outline" shape="pill" fullWidth={fullWidth} className={className}>
        <Link to={signInHref(pathname + search)}>{content}</Link>
      </Button>
    )
  }
  const ownShop = user.memberships.some((membership) => membership.businessId === businessId)
  if (ownShop || !hasAnyRole(user, ['customer'])) return null

  return (
    <Button
      variant="outline"
      shape="pill"
      fullWidth={fullWidth}
      className={cn(className)}
      loading={start.isPending}
      onClick={() =>
        start.mutate(
          { businessId, bookingId },
          { onSuccess: (conversation) => void navigate(`/inbox/${encodeURIComponent(conversation.id)}`) },
        )
      }
    >
      {content}
    </Button>
  )
}
