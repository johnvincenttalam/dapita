import type { MouseEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Demo, GallerySection } from '@/features/example/components/gallery/GallerySection'

const TOTAL_PAGES = 8

/** Pages to show around the current one, with null marking an ellipsis. */
function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  return sorted.flatMap((page, index) => {
    const previous = sorted[index - 1]
    return previous !== undefined && page - previous > 1 ? [null, page] : [page]
  })
}

function UrlPagination() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const page = Math.min(Math.max(Number(searchParams.get('page')) || 1, 1), TOTAL_PAGES)

  // PaginationLink renders a plain <a>; route plain clicks through the router so the
  // page doesn't reload, but let modifier clicks open a new tab as usual.
  const linkTo = (target: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(target))
    const href = `?${params.toString()}`
    return {
      href,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        void navigate(href, { preventScrollReset: true })
      },
    }
  }

  return (
    <div className="w-full space-y-3">
      <p className="text-sm text-muted-foreground">
        Real links that update <code className="font-mono text-xs">?page=</code>. Current page:{' '}
        <span className="font-medium text-foreground">{page}</span>
      </p>
      <Pagination className="justify-start">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              {...linkTo(Math.max(page - 1, 1))}
              aria-disabled={page === 1}
              className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>
          {pageWindow(page, TOTAL_PAGES).map((item, index) =>
            item === null ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink {...linkTo(item)} isActive={item === page}>
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              {...linkTo(Math.min(page + 1, TOTAL_PAGES))}
              aria-disabled={page === TOTAL_PAGES}
              className={page === TOTAL_PAGES ? 'pointer-events-none opacity-50' : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function NavigationSection() {
  return (
    <GallerySection id="navigation" title="Navigation" description="Tabs, breadcrumbs and pagination.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Tabs" contentClassName="block">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="billing" disabled>
                Billing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-3 text-sm text-muted-foreground">
              Arrow keys move between tabs; Tab moves into the panel.
            </TabsContent>
            <TabsContent value="usage" className="pt-3 text-sm text-muted-foreground">
              12,345 API calls this month (mock).
            </TabsContent>
          </Tabs>
        </Demo>
        <Demo title="Breadcrumbs" description="Built from route handles automatically, or from an explicit list.">
          <Breadcrumbs
            items={[{ label: 'Home', to: '/' }, { label: 'Projects', to: '/dashboard' }, { label: 'Design system' }]}
          />
        </Demo>
        <Demo title="Pagination" className="lg:col-span-2">
          <UrlPagination />
        </Demo>
      </div>
    </GallerySection>
  )
}
