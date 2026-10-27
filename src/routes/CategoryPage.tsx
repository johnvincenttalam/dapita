import { CompassIcon, SearchIcon, SearchXIcon, SparklesIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ChipNav } from '@/components/shared/ChipNav'
import { Container } from '@/components/shared/Container'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { market } from '@/config/market'
import { useCategoriesQuery, useShopSearchQuery } from '@/features/discovery/api/queries'
import { ShopCard, ShopCardSkeleton } from '@/features/discovery/components/ShopCard'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/utils'
import type { ServiceCategory } from '@/types/catalog'

const gridClass = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

function CategoryResults({ category, subcategories }: { category: ServiceCategory; subcategories: ServiceCategory[] }) {
  const [searchParams] = useSearchParams()
  const type = subcategories.find((sub) => sub.slug === searchParams.get('type'))
  const results = useShopSearchQuery({ category: type?.slug ?? category.slug, pageSize: 48 })
  const base = `/categories/${category.slug}`

  return (
    <div className="space-y-5">
      {subcategories.length ? (
        <ChipNav
          label={`${category.name} types`}
          items={[
            { label: 'All', to: base, active: !type },
            ...subcategories.map((sub) => ({ label: sub.name, to: `${base}?type=${sub.slug}`, active: sub === type })),
          ]}
        />
      ) : null}

      {results.isPending ? (
        <div className={gridClass}>
          {Array.from({ length: 3 }, (_, index) => (
            <ShopCardSkeleton key={index} variant="feature" />
          ))}
        </div>
      ) : results.isError ? (
        <ErrorState
          title="We couldn’t load shops"
          error={results.error}
          onRetry={() => void results.refetch()}
          isRetrying={results.isRefetching}
        />
      ) : results.data.total === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title={`No ${(type ?? category).name.toLowerCase()} listings yet`}
          description={`We’re still adding shops in ${market.city}. Try another type or explore everything nearby.`}
          action={
            <Button asChild variant="outline">
              <Link to="/explore">Explore all shops</Link>
            </Button>
          }
          bordered
        />
      ) : (
        <ul
          aria-label={`${(type ?? category).name} shops`}
          className={cn(gridClass, results.isPlaceholderData && 'opacity-60')}
        >
          {results.data.items.map((shop) => (
            <li key={shop.id}>
              <ShopCard shop={shop} category={category} variant="feature" headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Shops in one category with sub-category chips (design screen 10). */
export default function CategoryPage() {
  const { categorySlug = '' } = useParams()
  const categories = useCategoriesQuery()
  const category = categories.data?.find((candidate) => candidate.slug === categorySlug && !candidate.parentId)
  const subcategories = useMemo(
    () => (categories.data ?? []).filter((sub) => sub.parentId === category?.id && sub.status === 'active'),
    [categories.data, category?.id],
  )
  useDocumentTitle(category?.name ?? 'Category')

  const searchAction = (
    <Button asChild variant="ghost" size="icon">
      <Link to={`/explore?category=${categorySlug}`} aria-label="Search in this category">
        <SearchIcon aria-hidden="true" className="size-5" />
      </Link>
    </Button>
  )

  return (
    <Container className="space-y-5 py-page">
      <Breadcrumbs
        className="hidden md:block"
        minItems={2}
        labels={{ [`/categories/${categorySlug}`]: category?.name }}
      />

      {categories.isPending ? (
        <div className="space-y-5" aria-busy="true">
          <Skeleton className="mx-auto h-7 w-40 md:mx-0 md:h-9 md:w-64" />
          <div className={gridClass}>
            {Array.from({ length: 3 }, (_, index) => (
              <ShopCardSkeleton key={index} variant="feature" />
            ))}
          </div>
        </div>
      ) : categories.isError ? (
        <ErrorState
          title="We couldn’t load this category"
          error={categories.error}
          onRetry={() => void categories.refetch()}
          isRetrying={categories.isRefetching}
        />
      ) : !category || category.status === 'hidden' ? (
        <>
          <ScreenHeader title="Category not found" backTo="/" />
          <EmptyState
            icon={CompassIcon}
            title="We couldn’t find that category"
            description="It may have been renamed. Browse every shop instead."
            action={
              <Button asChild>
                <Link to="/explore">Explore all shops</Link>
              </Button>
            }
          />
        </>
      ) : category.status === 'coming_soon' ? (
        <>
          <ScreenHeader title={category.name} backTo="/" />
          <EmptyState
            icon={SparklesIcon}
            title={`${category.name} is coming soon`}
            description="We’re lining up partners so listings and availability are accurate before this launches."
            action={
              <Button asChild variant="outline">
                <Link to="/explore">Explore available services</Link>
              </Button>
            }
          />
        </>
      ) : (
        <>
          <ScreenHeader
            title={category.name}
            description={`Shops offering ${category.name.toLowerCase()} services in ${market.city}.`}
            backTo="/"
            mobileActions={searchAction}
          />
          <CategoryResults category={category} subcategories={subcategories} />
        </>
      )}
    </Container>
  )
}
