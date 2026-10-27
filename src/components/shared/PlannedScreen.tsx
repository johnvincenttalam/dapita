import { ConstructionIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMatches, useParams, useSearchParams } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Priority } from '@/config/navigation'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type { PlannedPageMeta, RouteHandle } from '@/types/router'

const priorityLabels: Record<Priority, string> = {
  P0: 'P0 · MVP',
  P1: 'P1 · After pilot validation',
  P2: 'P2 · Later release',
}

function usePlannedMeta(): PlannedPageMeta {
  const matches = useMatches()
  const meta = matches
    .map((match) => (match.handle as RouteHandle | undefined)?.planned)
    .findLast((planned) => planned !== undefined)
  return meta ?? { title: 'Coming soon', description: 'This screen is not built yet.', priority: 'P0' }
}

function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 font-medium break-words">{children}</dd>
    </div>
  )
}

/**
 * TEMPORARY: stands in for screens built in later phases. The route, layout, navigation,
 * guards and breadcrumbs are real; only the page body is a placeholder.
 */
export function PlannedScreen() {
  const meta = usePlannedMeta()
  const params = Object.entries(useParams()).filter(([, value]) => value)
  const [searchParams] = useSearchParams()
  const query = [...searchParams.entries()]
  useDocumentTitle(meta.title)

  return (
    <div className="space-y-6">
      <PageHeader title={meta.title} description={meta.description} />
      <Card className="shadow-sm ring-foreground/5">
        <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-3">
          <span className="row-span-2 grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <ConstructionIcon aria-hidden="true" className="size-5" />
          </span>
          <CardTitle>
            <h2>Screen planned</h2>
          </CardTitle>
          <CardDescription>
            Navigation and layout for this page are in place. The screen itself is built in a later phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            <DetailRow term="Priority">
              <Badge variant={meta.priority === 'P0' ? 'default' : 'outline'}>{priorityLabels[meta.priority]}</Badge>
            </DetailRow>
            <DetailRow term="Design reference">{meta.design ? `Screen ${meta.design}` : 'No design yet'}</DetailRow>
            {meta.refs?.length ? <DetailRow term="Requirements">{meta.refs.join(', ')}</DetailRow> : null}
            {params.length ? (
              <DetailRow term="Route parameters">
                {params.map(([key, value]) => (
                  <code key={key} className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {key}={value}
                  </code>
                ))}
              </DetailRow>
            ) : null}
            {query.length ? (
              <DetailRow term="Query">
                {query.map(([key, value]) => (
                  <code key={key} className="mr-2 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {key}={value}
                  </code>
                ))}
              </DetailRow>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
