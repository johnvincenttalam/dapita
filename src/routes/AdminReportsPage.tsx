import { FlagIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCasesQuery } from '@/features/admin/api/queries'
import { CaseStatusBadge } from '@/features/admin/components/CaseStatusBadge'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useNow } from '@/hooks/use-now'
import { formatRelative } from '@/lib/format'
import { caseStatusLabels } from '@/lib/moderation'
import type { CaseStatus } from '@/types/admin'

const filters: CaseStatus[] = ['open', 'in_progress', 'resolved']

/** Reports & cases (ADM-03): reported conversations, worked from open to resolved. */
export default function AdminReportsPage() {
  useDocumentTitle('Reports & cases')
  const now = useNow()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('status') as CaseStatus | null
  const status: CaseStatus = requested && filters.includes(requested) ? requested : 'open'
  const cases = useCasesQuery()
  const rows = cases.data?.filter((item) => item.status === status) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & cases"
        description="Conversations people reported. Take a case, keep notes, and record how it ended."
      />

      <Tabs
        value={status}
        onValueChange={(next) =>
          void navigate(next === 'open' ? '/admin/reports' : `/admin/reports?status=${next}`, { replace: true })
        }
      >
        <TabsList variant="line" className="h-auto w-full justify-start border-b border-border/70 pb-0 md:w-fit">
          {filters.map((item) => (
            <TabsTrigger key={item} value={item}>
              {caseStatusLabels[item]}
              {cases.data ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  ({cases.data.filter((row) => row.status === item).length})
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {cases.isError ? (
        <ErrorState error={cases.error} onRetry={() => void cases.refetch()} isRetrying={cases.isRefetching} />
      ) : cases.isPending ? (
        <Skeleton aria-hidden="true" className="h-60 rounded-3xl" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FlagIcon}
          title={status === 'open' ? 'No open reports' : `Nothing ${caseStatusLabels[status].toLowerCase()}`}
          description={status === 'open' ? 'When someone reports a conversation, it appears here.' : undefined}
          bordered
        />
      ) : (
        <ul
          aria-label={caseStatusLabels[status]}
          className="max-w-4xl divide-y divide-border/70 overflow-hidden rounded-3xl card-surface"
        >
          {rows.map((item) => (
            <li key={item.id}>
              <Link
                to={`/admin/reports/${encodeURIComponent(item.id)}`}
                className="block space-y-1 px-5 py-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 font-semibold">
                    {item.customerName} and {item.businessName}
                  </span>
                  <CaseStatusBadge status={item.status} className="shrink-0" />
                </span>
                <span className="block text-sm text-pretty">“{item.reason}”</span>
                <span className="block text-xs text-muted-foreground">
                  Reported by the {item.reporterSide === 'customer' ? 'customer' : 'shop'}{' '}
                  {formatRelative(item.createdAt, now)}
                  {item.ownerName ? ` · ${item.ownerName} is handling it` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
