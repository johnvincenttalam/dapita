import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMerchantReviewQuery } from '@/features/admin/api/queries'
import { BusinessStatusBadge } from '@/features/admin/components/BusinessStatusBadge'
import { ModerationDialog } from '@/features/admin/components/ModerationDialog'
import { OpeningHoursList } from '@/features/shops/components/OpeningHoursList'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApiError } from '@/lib/api-client'
import { formatDateTime, formatDuration, formatPrice } from '@/lib/format'
import { moderationLabels } from '@/lib/moderation'
import type { ModerationActionType } from '@/types/admin'

/** One listing as submitted, the decisions it allows, and every decision so far (ADM-01). */
export default function AdminMerchantReviewPage() {
  const { businessId = '' } = useParams()
  const review = useMerchantReviewQuery(businessId)
  const [action, setAction] = useState<ModerationActionType | null>(null)
  useDocumentTitle(review.data?.business.name ?? 'Listing review')

  if (review.isError) {
    const missing = review.error instanceof ApiError && review.error.status === 404
    return (
      <ErrorState
        title={missing ? 'We couldn’t find that listing.' : undefined}
        error={missing ? undefined : review.error}
        onRetry={missing ? undefined : () => void review.refetch()}
        action={
          <Button asChild variant="outline" shape="pill">
            <Link to="/admin/merchants">All merchants</Link>
          </Button>
        }
      />
    )
  }
  if (!review.data) return <Skeleton aria-hidden="true" className="h-[32rem] rounded-3xl" />

  const { business, services, owner, history, availableActions, areaName, categoryNames } = review.data
  const facts: [string, string][] = [
    ['Categories', categoryNames.join(', ') || 'None chosen'],
    ['Area', areaName || 'None chosen'],
    ['Address', business.address || 'Not given'],
    ['Phone', business.phone ?? 'Not given'],
    ['Owner', owner.email ? `${owner.name} · ${owner.email}` : owner.name],
    ['Booking method', business.bookingMethod === 'request' ? 'Requests, confirmed by the shop' : 'Instant'],
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={business.name}
        description={<BusinessStatusBadge status={business.status} />}
        actions={
          business.status === 'approved' ? (
            <Button asChild variant="outline" shape="pill">
              <Link to={`/shops/${encodeURIComponent(business.slug)}`}>View shop page</Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Panel title="Listing">
            <p className="text-pretty">{business.description || 'No description yet.'}</p>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {facts.map(([term, value]) => (
                <div key={term} className="min-w-0">
                  <dt className="text-sm text-muted-foreground">{term}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Services" description={`${services.length} on the menu`}>
            {services.length ? (
              <ul className="-mx-2 divide-y divide-border/70">
                {services.map((service) => (
                  <li key={service.id} className="flex items-baseline justify-between gap-3 px-2 py-2.5">
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {service.name}
                        {service.active ? null : <span className="ml-2 text-xs text-muted-foreground">Hidden</span>}
                      </span>
                      {service.description ? (
                        <span className="block text-sm text-muted-foreground">{service.description}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums">
                      {formatPrice(service.price)} · {formatDuration(service.durationMinutes)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No services yet.</p>
            )}
          </Panel>

          <Panel title="Opening hours">
            <OpeningHoursList hours={business.hours} closures={business.closures} />
          </Panel>

          <Panel title="Policies">
            <dl className="space-y-3">
              {[
                ['Cancellation', business.policies.cancellation],
                ['No-show', business.policies.noShow],
                ['Deposit', business.policies.deposit],
              ].map(([term, value]) =>
                value ? (
                  <div key={term}>
                    <dt className="text-sm text-muted-foreground">{term}</dt>
                    <dd className="text-pretty">{value}</dd>
                  </div>
                ) : null,
              )}
              {business.policies.cancellation ? null : (
                <p className="text-sm text-muted-foreground">No cancellation policy yet.</p>
              )}
            </dl>
          </Panel>
        </div>

        <div className="min-w-0 space-y-6 lg:sticky lg:top-24">
          <Panel
            title="Decision"
            description={
              availableActions.length
                ? 'Each decision is recorded with your name and reason.'
                : business.status === 'draft'
                  ? 'The owner hasn’t submitted this listing yet.'
                  : business.status === 'changes_requested'
                    ? 'Waiting for the owner to make changes and resubmit.'
                    : 'No decisions apply in this state.'
            }
          >
            {availableActions.length ? (
              <div className="flex flex-wrap gap-2">
                {availableActions.map((item) => (
                  <Button
                    key={item}
                    shape="pill"
                    variant={
                      item === 'approve' || item === 'reinstate'
                        ? 'default'
                        : item === 'request_changes'
                          ? 'outline'
                          : 'ghost'
                    }
                    className={
                      item === 'reject' || item === 'suspend' ? 'text-destructive hover:text-destructive' : undefined
                    }
                    onClick={() => setAction(item)}
                  >
                    {moderationLabels[item].verb}
                  </Button>
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel title="History">
            {history.length ? (
              <ol className="space-y-4">
                {history.map((entry) => (
                  <li key={entry.id} className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {moderationLabels[entry.action].done} by {entry.actorName}
                    </p>
                    <p className="text-sm text-pretty">{entry.reason}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No decisions yet.</p>
            )}
          </Panel>
        </div>
      </div>

      <ModerationDialog
        businessId={business.id}
        businessName={business.name}
        action={action}
        onClose={() => setAction(null)}
      />
    </div>
  )
}
