import { Badge } from '@/components/ui/badge'
import { bookingStatusMeta } from '@/lib/booking-status'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/types/booking'

/** Status pill from design screen 11. The label carries the meaning; colour only reinforces it. */
export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const meta = bookingStatusMeta[status]
  return (
    <Badge variant={meta.tone} className={cn('rounded-full px-2.5', className)}>
      {meta.label}
    </Badge>
  )
}
