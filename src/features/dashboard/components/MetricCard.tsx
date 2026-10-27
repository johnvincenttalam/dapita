import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Metric } from '@/types/domain'

const trendStyles = {
  up: { icon: ArrowUpRightIcon, className: 'text-success', label: 'Up' },
  down: { icon: ArrowDownRightIcon, className: 'text-destructive', label: 'Down' },
  flat: { icon: ArrowRightIcon, className: 'text-muted-foreground', label: 'No change' },
} as const

export function MetricCard({ metric }: { metric: Metric }) {
  const trend = trendStyles[metric.trend]
  const TrendIcon = trend.icon

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{metric.label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{metric.value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className={cn('inline-flex items-center gap-0.5 font-medium', trend.className)}>
            <TrendIcon aria-hidden="true" className="size-4" />
            <span className="sr-only">{trend.label}</span>
            {metric.change}
          </span>
          {metric.helpText}
        </p>
      </CardContent>
    </Card>
  )
}

export function MetricCardSkeleton() {
  return (
    <Card className="gap-2" aria-hidden="true">
      <CardHeader className="gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  )
}
