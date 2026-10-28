import { ChevronLeftIcon, ChevronRightIcon, ListIcon, MapIcon, SearchXIcon } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ChipNav } from '@/components/shared/ChipNav'
import { Container } from '@/components/shared/Container'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { market } from '@/config/market'
import { useAreasQuery, useCategoriesQuery, useShopSearchQuery } from '@/features/discovery/api/queries'
import { ExploreFilters } from '@/features/discovery/components/ExploreFilters'
import { ExploreMap } from '@/features/discovery/components/ExploreMap'
import { ShopListItem, ShopListItemSkeleton } from '@/features/discovery/components/ShopListItem'
import { parseExploreParams, updateExploreParams } from '@/features/discovery/explore-params'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useUserLocation } from '@/hooks/use-user-location'
import { distanceKm } from '@/lib/geo'
import { cn } from '@/lib/utils'
import type { ShopSearchParams } from '@/services/shops.service'

/** Keyword search that applies on submit, so results don't jump while typing on a phone keyboard. */
function KeywordSearch({ q, onSearch }: { q?: string; onSearch: (q?: string) => void }) {
  const [value, setValue] = useState(q ?? '')
  const [syncedQ, setSyncedQ] = useState(q)
  // Follow the URL when it changes elsewhere, e.g. the header search or the back button.
  if (q !== syncedQ) {
    setSyncedQ(q)
    setValue(q ?? '')
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(value.trim() || undefined)
  }

  return (
    <form role="search" onSubmit={onSubmit} className="min-w-0 flex-1">
      <SearchInput
        value={value}
        onValueChange={(next) => {
          setValue(next)
          if (!next) onSearch(undefined)
        }}
        placeholder="Search shops or services…"
        label="Search services, shops, or areas"
        enterKeyHint="search"
        className="rounded-full sm:max-w-md"
      />
    </form>
  )
}

/** The most results the map shows at once (the API's largest page). */
const MAP_LIMIT = 50

/** List or map, kept in the URL so either view can be shared. */
function ViewSwitch({ view, hrefFor }: { view: 'list' | 'map'; hrefFor: (view: 'list' | 'map') => string }) {
  const options = [
    { value: 'list', label: 'List', icon: ListIcon },
    { value: 'map', label: 'Map', icon: MapIcon },
  ] as const
  return (
    <div role="group" aria-label="View" className="flex shrink-0 rounded-full border bg-card p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <Link
          key={value}
          to={hrefFor(value)}
          replace
          aria-current={view === value ? 'true' : undefined}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-3',
            view === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </Link>
      ))}
    </div>
  )
}

/** Search results as a list or on a map (CUS-02, CUS-04; design screen 4). */
export default function ExplorePage() {
  useDocumentTitle('Explore')
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseExploreParams(searchParams), [searchParams])
  const view = searchParams.get('view') === 'map' ? 'map' : 'list'
  const categories = useCategoriesQuery()
  const areas = useAreasQuery()
  // The map shows every result at once rather than a page of them.
  const results = useShopSearchQuery(view === 'map' ? { ...params, page: undefined, pageSize: MAP_LIMIT } : params)
  const userPosition = useUserLocation((state) => state.position)

  const change = (changes: Partial<ShopSearchParams>) =>
    setSearchParams((current) => updateExploreParams(current, changes), { replace: true })
  const reset = () => setSearchParams(params.q ? { q: params.q } : {}, { replace: true })
  const hrefWith = (changes: Partial<ShopSearchParams>) => `/explore?${updateExploreParams(searchParams, changes)}`
  const hrefForView = (next: 'list' | 'map') => {
    const query = new URLSearchParams(searchParams)
    query.delete('page')
    if (next === 'map') query.set('view', 'map')
    else query.delete('view')
    return `/explore?${query}`
  }

  const categoryById = useMemo(() => new Map(categories.data?.map((c) => [c.id, c])), [categories.data])
  const chips = (categories.data ?? []).filter((category) => !category.parentId && category.status === 'active')
  const data = results.data
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <Container className="space-y-5 py-page">
      <Breadcrumbs className="hidden md:block" minItems={2} />
      <ScreenHeader title="Explore" description={`Find barbers, salons, spas and more in ${market.city}.`} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <KeywordSearch q={params.q} onSearch={(q) => change({ q })} />
          <ExploreFilters
            params={params}
            areas={areas.data ?? []}
            onChange={change}
            total={data?.total}
            onReset={() => change({ area: undefined, priceMax: undefined, openNow: undefined })}
          />
          <ViewSwitch view={view} hrefFor={hrefForView} />
        </div>
        <ChipNav
          label="Categories"
          items={[
            { label: 'All', to: hrefWith({ category: undefined }), active: !params.category },
            ...chips.map((category) => ({
              label: category.name,
              to: hrefWith({ category: category.slug }),
              active: params.category === category.slug,
            })),
          ]}
        />
      </div>

      <section aria-labelledby="results-heading" aria-busy={results.isFetching} className="space-y-4">
        <h2 id="results-heading" className="sr-only">
          Results
        </h2>
        <p role="status" className="text-sm text-muted-foreground">
          {data ? `${data.total} ${data.total === 1 ? 'shop' : 'shops'}${params.q ? ` for “${params.q}”` : ''}` : ''}
          {data && view === 'map' && data.total > data.items.length
            ? `. The map shows the first ${data.items.length}; search or filter to narrow it down.`
            : ''}
        </p>

        {results.isPending ? (
          <ul className="grid gap-3 md:grid-cols-2" aria-label="Loading results">
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index}>
                <ShopListItemSkeleton />
              </li>
            ))}
          </ul>
        ) : results.isError ? (
          <ErrorState
            title="We couldn’t load shops"
            error={results.error}
            onRetry={() => void results.refetch()}
            isRetrying={results.isRefetching}
          />
        ) : data && data.total === 0 ? (
          <EmptyState
            icon={SearchXIcon}
            title="No shops match your search"
            description="Try another keyword, a different area or fewer filters."
            action={
              <Button variant="outline" onClick={reset}>
                Clear filters
              </Button>
            }
            bordered
          />
        ) : data && view === 'map' ? (
          <div className={cn(results.isPlaceholderData && 'opacity-60')}>
            <ExploreMap shops={data.items} categoryById={categoryById} />
          </div>
        ) : data ? (
          <>
            <ul className={cn('grid gap-3 md:grid-cols-2', results.isPlaceholderData && 'opacity-60')}>
              {data.items.map((shop) => (
                <li key={shop.id}>
                  <ShopListItem
                    shop={shop}
                    category={categoryById.get(shop.categoryIds[0] ?? '')}
                    distance={userPosition && shop.coordinates ? distanceKm(userPosition, shop.coordinates) : undefined}
                  />
                </li>
              ))}
            </ul>
            {pageCount > 1 ? (
              <nav aria-label="Pages" className="flex items-center justify-between gap-3 pt-2">
                <Button asChild variant="outline" shape="pill" className={cn(data.page <= 1 && 'invisible')}>
                  <Link to={hrefWith({ page: data.page - 1 })} replace>
                    <ChevronLeftIcon aria-hidden="true" />
                    Previous
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {pageCount}
                </p>
                <Button asChild variant="outline" shape="pill" className={cn(data.page >= pageCount && 'invisible')}>
                  <Link to={hrefWith({ page: data.page + 1 })} replace>
                    Next
                    <ChevronRightIcon aria-hidden="true" />
                  </Link>
                </Button>
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    </Container>
  )
}
