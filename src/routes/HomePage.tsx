import { ArrowRightIcon, StoreIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { Container } from '@/components/shared/Container'
import { HorizontalScroller } from '@/components/shared/HorizontalScroller'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { SiteSearchForm } from '@/components/shared/SiteSearchForm'
import { Button } from '@/components/ui/button'
import { useCategoriesQuery, useFeaturedShopsQuery } from '@/features/discovery/api/queries'
import { CategoryGrid, CategoryGridSkeleton } from '@/features/discovery/components/CategoryGrid'
import { HomeHero } from '@/features/discovery/components/HomeHero'
import { ShopCard, ShopCardSkeleton } from '@/features/discovery/components/ShopCard'
import { useDocumentTitle } from '@/hooks/use-document-title'

/** Customer home (design screen 3): search, banner, category shortcuts and featured shops (CUS-01). */
export default function HomePage() {
  useDocumentTitle()
  const categories = useCategoriesQuery()
  const featured = useFeaturedShopsQuery()
  const categoryById = useMemo(() => new Map(categories.data?.map((c) => [c.id, c])), [categories.data])

  return (
    <Container className="space-y-8 py-page md:space-y-12">
      <SiteSearchForm className="md:hidden" inputClassName="h-11 shadow-xs" />

      <HomeHero />

      <section aria-labelledby="categories-heading" className="space-y-4">
        <h2 id="categories-heading" className="sr-only type-heading md:not-sr-only">
          Browse by category
        </h2>
        {categories.isPending ? (
          <CategoryGridSkeleton />
        ) : categories.isError ? (
          <ErrorState
            title="We couldn’t load categories"
            error={categories.error}
            onRetry={() => void categories.refetch()}
            isRetrying={categories.isRefetching}
          />
        ) : (
          <CategoryGrid categories={categories.data} />
        )}
      </section>

      <section aria-labelledby="featured-heading" className="space-y-4">
        <SectionHeader
          id="featured-heading"
          title="Featured shops"
          className="flex-row items-end justify-between"
          actions={
            <Button asChild variant="link" className="px-0">
              <Link to="/explore">See all</Link>
            </Button>
          }
        />
        {featured.isPending ? (
          <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <ShopCardSkeleton key={index} className="w-44 shrink-0 md:w-auto" />
            ))}
          </div>
        ) : featured.isError ? (
          <ErrorState
            title="We couldn’t load featured shops"
            error={featured.error}
            onRetry={() => void featured.refetch()}
            isRetrying={featured.isRefetching}
          />
        ) : (
          <HorizontalScroller
            label="Featured shops"
            items={featured.data}
            getKey={(shop) => shop.id}
            renderItem={(shop) => <ShopCard shop={shop} category={categoryById.get(shop.categoryIds[0] ?? '')} />}
          />
        )}
      </section>

      <section
        aria-labelledby="business-heading"
        className="flex flex-col gap-4 rounded-3xl bg-secondary p-6 sm:flex-row sm:items-center sm:justify-between md:p-8"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-primary">
            <StoreIcon aria-hidden="true" className="size-6" />
          </span>
          <div className="space-y-1">
            <h2 id="business-heading" className="type-heading">
              Run a salon, spa or barbershop?
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              List your business for free and manage booking requests in one place.
            </p>
          </div>
        </div>
        <Button asChild shape="pill" className="shrink-0">
          <Link to="/business/sign-up">
            List your business
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </Container>
  )
}
