import type { ReactNode } from 'react'

import { HorizontalScroller } from '@/components/shared/HorizontalScroller'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { ShopCard, ShopCardSkeleton } from '@/features/discovery/components/ShopCard'
import { useRecommendationsQuery } from '@/features/recommendations/api/queries'
import { rankNearby, recommendationTag } from '@/lib/recommendations'
import type { Coordinates } from '@/types/common'

interface RecommendedRowProps {
  title: string
  headingId: string
  /** The viewer's stored location; without it the row ranks by fit alone and shows no distances. */
  position?: Coordinates
  /** The home page's row shows its loading and error states; elsewhere the row stays hidden until it has shops. */
  prominent?: boolean
  /** Shown beside the heading, e.g. a link to set a location. */
  actions?: ReactNode
}

/** Suggested shops near the viewer, each tagged with why it's there. */
export function RecommendedRow({ title, headingId, position, prominent = false, actions }: RecommendedRowProps) {
  const recommendations = useRecommendationsQuery()
  const categories = useCategoriesQuery()

  let content
  if (recommendations.isPending) {
    if (!prominent) return null
    content = (
      <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <ShopCardSkeleton key={index} className="w-44 shrink-0 md:w-auto" />
        ))}
      </div>
    )
  } else if (recommendations.isError) {
    if (!prominent) return null
    content = (
      <ErrorState
        title="We couldn’t load suggestions"
        error={recommendations.error}
        onRetry={() => void recommendations.refetch()}
        isRetrying={recommendations.isRefetching}
      />
    )
  } else {
    const ranked = rankNearby(recommendations.data, position)
    if (!ranked.length) return null
    const categoryById = new Map(categories.data?.map((category) => [category.id, category]))
    content = (
      <HorizontalScroller
        label={title}
        items={ranked}
        getKey={(entry) => entry.shop.id}
        renderItem={(entry) => (
          <ShopCard
            shop={entry.shop}
            category={categoryById.get(entry.shop.categoryIds[0] ?? '')}
            distanceKm={entry.distanceKm}
            tag={recommendationTag(entry, categoryById.get(entry.categoryId ?? '')?.name, Boolean(position))}
          />
        )}
      />
    )
  }

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <SectionHeader id={headingId} title={title} actions={actions} />
      {content}
    </section>
  )
}
