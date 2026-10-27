import { Badge } from '@/components/ui/badge'
import { statusOptions } from '@/features/dashboard/constants'
import type { CustomerStatus } from '@/types/domain'

/** Icon + text + colour, so status never relies on colour alone. */
export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const option = statusOptions.find((o) => o.value === status) ?? statusOptions[0]
  if (!option) return null
  const Icon = option.icon
  return (
    <Badge variant={option.variant}>
      <Icon aria-hidden="true" />
      {option.label}
    </Badge>
  )
}
