import { StoreIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMerchantsQuery } from '@/features/admin/api/queries'
import { BusinessStatusBadge } from '@/features/admin/components/BusinessStatusBadge'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { formatRelative } from '@/lib/format'
import { businessStatusLabels } from '@/lib/moderation'
import type { BusinessStatus } from '@/types/business'

/** The queue comes first; drafts last, since there's nothing to decide on them yet. */
const filters: BusinessStatus[] = ['pending_review', 'approved', 'changes_requested', 'suspended', 'rejected', 'draft']

/** Merchants (ADM-01): the approval queue and every listing by state. */
export default function AdminMerchantsPage() {
  useDocumentTitle('Merchants')
  const now = useNow()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('status') as BusinessStatus | null
  const status: BusinessStatus = requested && filters.includes(requested) ? requested : 'pending_review'
  const merchants = useMerchantsQuery()
  const rows = merchants.data?.filter((item) => item.status === status) ?? []
  const label = businessStatusLabels[status]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merchants"
        description="Review new listings and act on live ones. Every decision needs a reason."
      />

      <Tabs
        className="gap-6"
        value={status}
        onValueChange={(next) =>
          void navigate(next === 'pending_review' ? '/admin/merchants' : `/admin/merchants?status=${next}`, {
            replace: true,
          })
        }
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start overflow-x-auto border-b border-border/70 pb-0 md:w-fit"
        >
          {filters.map((item) => (
            <TabsTrigger key={item} value={item}>
              {businessStatusLabels[item]}
              {merchants.data ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({merchants.data.filter((row) => row.status === item).length})
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={status}>
          {merchants.isError ? (
            <ErrorState
              error={merchants.error}
              onRetry={() => void merchants.refetch()}
              isRetrying={merchants.isRefetching}
            />
          ) : merchants.isPending ? (
            <Skeleton aria-hidden="true" className="h-72 rounded-3xl" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={StoreIcon}
              title={status === 'pending_review' ? 'Nothing to review' : `No listings: ${label.toLowerCase()}`}
              description={
                status === 'pending_review' ? 'New listings appear here when owners submit them.' : undefined
              }
              bordered
            />
          ) : (
            <ul
              aria-label={label}
              className="max-w-4xl divide-y divide-border/70 overflow-hidden rounded-3xl card-surface"
            >
              {rows.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/admin/merchants/${encodeURIComponent(item.id)}`}
                    className="flex flex-col gap-1 px-5 py-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{item.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[item.categoryNames.join(', '), item.areaName].filter(Boolean).join(' · ') || 'No details yet'}{' '}
                        · {item.serviceCount} {item.serviceCount === 1 ? 'service' : 'services'}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                      <span>Updated {formatRelative(item.updatedAt, now)}</span>
                      <BusinessStatusBadge status={item.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
