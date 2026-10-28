import { useId, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCaseQuery, useCaseStepMutation } from '@/features/admin/api/queries'
import { CaseStatusBadge } from '@/features/admin/components/CaseStatusBadge'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApiError, getErrorMessage } from '@/lib/api-client'
import { bookingStatusMeta } from '@/lib/booking-status'
import { formatAppointment, formatDateTime } from '@/lib/format'
import { caseKindLabels, caseTitle } from '@/lib/moderation'
import { cn } from '@/lib/utils'
import type { CaseDetails, CaseEvent } from '@/types/admin'

const eventLabel: Record<CaseEvent['kind'], string> = {
  opened: 'Opened by',
  reported_again: 'Reported again by',
  taken: 'Taken by',
  note: 'Note from',
  resolved: 'Resolved by',
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

/** Who sent it and where to reply, plus the booking it's about. */
function CaseFacts({ item }: { item: CaseDetails }) {
  return (
    <dl className="space-y-2 text-sm">
      <Fact term="Sent by">
        {item.reporterName} ({item.reporterSide === 'customer' ? 'customer' : 'shop'})
      </Fact>
      <Fact term="Reply to">
        {item.reporterEmail ? (
          <a
            href={`mailto:${item.reporterEmail}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {item.reporterEmail}
          </a>
        ) : (
          'Account no longer exists'
        )}
      </Fact>
      {item.booking ? (
        <Fact term="Booking">
          <span className="font-mono font-semibold">{item.booking.reference}</span> · {item.booking.serviceName},{' '}
          {formatAppointment(item.booking.start)} · {bookingStatusMeta[item.booking.status].label}
        </Fact>
      ) : null}
    </dl>
  )
}

function ReportedConversation({ item }: { item: CaseDetails }) {
  return (
    <Panel title="Reported conversation" description={`“${item.reason}”`}>
      <div role="log" aria-label="Conversation" className="space-y-2">
        {item.messages.map((message) => {
          const fromCustomer = message.senderRole === 'customer'
          return (
            <div key={message.id} className={cn('flex flex-col', fromCustomer ? 'items-start' : 'items-end')}>
              <p
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap',
                  fromCustomer ? 'rounded-bl-md bg-muted' : 'rounded-br-md bg-secondary text-secondary-foreground',
                )}
              >
                <span className="sr-only">{fromCustomer ? item.customerName : item.businessName}: </span>
                {message.body}
              </p>
              <span className="mt-0.5 px-1 type-micro font-normal text-muted-foreground">
                {fromCustomer ? item.customerName : item.businessName} · {formatDateTime(message.sentAt)}
              </span>
            </div>
          )
        })}
      </div>
      <CaseFacts item={item} />
    </Panel>
  )
}

function SupportRequest({ item }: { item: CaseDetails }) {
  return (
    <Panel title="Request" description={caseKindLabels[item.kind]}>
      <p className="rounded-2xl bg-muted/70 p-4 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">{item.reason}</p>
      <CaseFacts item={item} />
    </Panel>
  )
}

/** One case: the reported conversation or the request, what's been done, and the next step (ADM-03). */
export default function AdminCasePage() {
  const { caseId = '' } = useParams()
  const details = useCaseQuery(caseId)
  const step = useCaseStepMutation(caseId)
  const noteId = useId()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  useDocumentTitle('Case')

  if (details.isError) {
    const missing = details.error instanceof ApiError && details.error.status === 404
    return (
      <ErrorState
        title={missing ? 'We couldn’t find that case.' : undefined}
        error={missing ? undefined : details.error}
        action={
          <Button asChild variant="outline" shape="pill">
            <Link to="/admin/reports">All reports</Link>
          </Button>
        }
      />
    )
  }
  if (!details.data) return <Skeleton aria-hidden="true" className="h-[32rem] rounded-3xl" />
  const item = details.data
  const resolved = item.status === 'resolved'

  const run = async (kind: 'take' | 'note' | 'resolve') => {
    setError(undefined)
    try {
      await step.mutateAsync(kind === 'take' ? { kind } : { kind, text: note })
      if (kind !== 'take') setNote('')
      if (kind === 'take') toast.success('You’re handling this case.')
      if (kind === 'resolve') toast.success('Case resolved.')
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={caseTitle(item)}
        description={<CaseStatusBadge status={item.status} />}
        actions={
          item.businessId ? (
            <Button asChild variant="outline" shape="pill">
              <Link
                to={`/admin/merchants/${encodeURIComponent(item.businessId)}`}
                aria-label={`Review ${item.businessName ?? 'the shop'}`}
              >
                Review the shop
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {item.kind === 'message' ? <ReportedConversation item={item} /> : <SupportRequest item={item} />}

        <div className="min-w-0 space-y-6 lg:sticky lg:top-24">
          {resolved ? null : (
            <Panel
              title="Next step"
              description={item.ownerName ? `${item.ownerName} is handling this.` : 'Nobody has taken this yet.'}
            >
              {item.status === 'open' ? (
                <Button
                  shape="pill"
                  loading={step.isPending && step.variables?.kind === 'take'}
                  onClick={() => void run('take')}
                >
                  Take case
                </Button>
              ) : null}
              <div className="space-y-2">
                <label htmlFor={noteId} className="type-label">
                  Note
                </label>
                <Textarea
                  id={noteId}
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What you did or found. Resolving uses this as the outcome."
                  aria-invalid={Boolean(error) || undefined}
                  aria-describedby={error ? `${noteId}-error` : undefined}
                />
                {error ? (
                  <p id={`${noteId}-error`} className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" shape="pill" disabled={step.isPending} onClick={() => void run('note')}>
                  Add note
                </Button>
                <Button shape="pill" disabled={step.isPending} onClick={() => void run('resolve')}>
                  Resolve
                </Button>
              </div>
            </Panel>
          )}

          <Panel title="Audit trail">
            <ol className="space-y-4">
              {item.events.map((event) => (
                <li key={event.id} className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {eventLabel[event.kind]} {event.actorName}
                  </p>
                  {event.text ? <p className="text-sm text-pretty">{event.text}</p> : null}
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  )
}
