import { Badge } from '@/components/ui/badge'
import { caseStatusLabels } from '@/lib/moderation'
import { cn } from '@/lib/utils'
import type { CaseStatus } from '@/types/admin'

const tones = { open: 'warning', in_progress: 'info', resolved: 'success' } as const

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <Badge variant={tones[status]} className={cn('rounded-full px-2.5', className)}>
      {caseStatusLabels[status]}
    </Badge>
  )
}
