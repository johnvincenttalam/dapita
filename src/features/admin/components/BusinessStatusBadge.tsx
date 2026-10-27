import { Badge } from '@/components/ui/badge'
import { businessStatusLabels } from '@/lib/moderation'
import { cn } from '@/lib/utils'
import type { BusinessStatus } from '@/types/business'

const tones: Record<BusinessStatus, 'success' | 'warning' | 'info' | 'destructive' | 'outline'> = {
  draft: 'outline',
  pending_review: 'warning',
  changes_requested: 'info',
  approved: 'success',
  suspended: 'destructive',
  rejected: 'destructive',
}

/** A listing's state, as a status pill (DESIGN.md: status colours describe real state). */
export function BusinessStatusBadge({ status, className }: { status: BusinessStatus; className?: string }) {
  return (
    <Badge variant={tones[status]} className={cn('rounded-full px-2.5', className)}>
      {businessStatusLabels[status]}
    </Badge>
  )
}
