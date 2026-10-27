import type { LucideIcon } from 'lucide-react'
import { CircleCheckIcon, CircleDashedIcon, CirclePauseIcon, CircleXIcon } from 'lucide-react'

import type { BadgeProps } from '@/components/ui/badge'
import type { CustomerPlan, CustomerStatus } from '@/types/domain'

export const statusOptions: {
  value: CustomerStatus
  label: string
  icon: LucideIcon
  variant: BadgeProps['variant']
}[] = [
  { value: 'active', label: 'Active', icon: CircleCheckIcon, variant: 'success' },
  { value: 'trialing', label: 'Trialing', icon: CircleDashedIcon, variant: 'info' },
  { value: 'paused', label: 'Paused', icon: CirclePauseIcon, variant: 'warning' },
  { value: 'churned', label: 'Churned', icon: CircleXIcon, variant: 'destructive' },
]

export const planOptions: { value: CustomerPlan; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

export const planLabels: Record<CustomerPlan, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' }
