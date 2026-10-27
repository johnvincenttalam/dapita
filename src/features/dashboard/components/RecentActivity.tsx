import type { LucideIcon } from 'lucide-react'
import {
  ActivityIcon,
  ArrowUpCircleIcon,
  FileTextIcon,
  MessageSquareIcon,
  TriangleAlertIcon,
  UserPlusIcon,
} from 'lucide-react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentActivityQuery } from '@/features/dashboard/api/queries'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { ActivityKind } from '@/types/domain'

const kindIcons: Record<ActivityKind, LucideIcon> = {
  signup: UserPlusIcon,
  upgrade: ArrowUpCircleIcon,
  comment: MessageSquareIcon,
  invoice: FileTextIcon,
  alert: TriangleAlertIcon,
}

export function RecentActivity() {
  const { data, isPending, isError, error, refetch, isRefetching } = useRecentActivityQuery()

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <h2>Recent activity</h2>
        </CardTitle>
        <CardDescription>Latest events across all workspaces (mock).</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <ul
            className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3"
            aria-busy="true"
            aria-label="Loading activity"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="flex gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : isError ? (
          <ErrorState
            title="Activity unavailable"
            error={error}
            onRetry={() => void refetch()}
            isRetrying={isRefetching}
          />
        ) : data.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title="No activity yet"
            description="Events will appear here as customers use the product."
          />
        ) : (
          <ol className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((item) => {
              const Icon = kindIcons[item.kind]
              return (
                <li key={item.id} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 text-sm">
                    <p>
                      <span className="font-medium">{item.actor}</span> {item.message}
                    </p>
                    <time
                      dateTime={item.occurredAt}
                      title={formatDateTime(item.occurredAt)}
                      className="text-xs text-muted-foreground"
                    >
                      {formatRelative(item.occurredAt)}
                    </time>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
