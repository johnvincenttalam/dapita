import { ArrowRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useCasesQuery, useMerchantsQuery } from '@/features/admin/api/queries'
import { useDocumentTitle } from '@/hooks/use-document-title'

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Operations overview (§2.4): what is waiting for Dapita staff, each linking to where it's handled. */
export default function AdminOverviewPage() {
  useDocumentTitle('Overview')
  const merchants = useMerchantsQuery()
  const cases = useCasesQuery()

  const pending = merchants.data?.filter((item) => item.status === 'pending_review') ?? []
  const open = cases.data?.filter((item) => item.status === 'open') ?? []
  const inProgress = cases.data?.filter((item) => item.status === 'in_progress') ?? []

  const items = [
    {
      to: '/admin/merchants',
      title: plural(pending.length, 'listing waiting for review', 'listings waiting for review'),
      detail: pending.length
        ? pending
            .slice(0, 3)
            .map((item) => item.name)
            .join(', ')
        : 'Nothing to review.',
    },
    {
      to: '/admin/reports',
      title: plural(open.length, 'open report', 'open reports'),
      detail: inProgress.length
        ? `${plural(inProgress.length, 'case', 'cases')} in progress too.`
        : open.length
          ? 'Nobody has taken them yet.'
          : 'No reports waiting.',
    },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Overview" description="What’s waiting for Dapita staff." />
      {merchants.isError || cases.isError ? (
        <ErrorState
          error={merchants.error ?? cases.error}
          onRetry={() => void Promise.all([merchants.refetch(), cases.refetch()])}
        />
      ) : !merchants.data || !cases.data ? (
        <Skeleton aria-hidden="true" className="h-48 rounded-3xl" />
      ) : (
        <Panel title="Needs attention">
          <ul className="-mx-2 divide-y divide-border/70">
            {items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 rounded-xl px-2 py-3.5 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{item.detail}</span>
                  </span>
                  <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
