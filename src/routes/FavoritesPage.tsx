import { HeartIcon } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { ShopCard, ShopCardSkeleton } from '@/features/discovery/components/ShopCard'
import { useMyFavoritesQuery } from '@/features/favorites/api/queries'
import { RecommendedRow } from '@/features/recommendations/components/RecommendedRow'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useUserLocation } from '@/hooks/use-user-location'

const gridClass = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'

/** Saved shops, most recently saved first (CUS-07), then similar shops near the customer. */
export default function FavoritesPage() {
  useDocumentTitle('Favorites')
  const favorites = useMyFavoritesQuery()
  const categories = useCategoriesQuery()
  const { position } = useUserLocation()

  let content
  if (favorites.isPending) {
    content = (
      <div className={gridClass} aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <ShopCardSkeleton key={index} variant="feature" />
        ))}
      </div>
    )
  } else if (favorites.isError) {
    content = (
      <ErrorState
        title="We couldn’t load your favorites"
        error={favorites.error}
        onRetry={() => void favorites.refetch()}
      />
    )
  } else if (!favorites.data.length) {
    content = (
      <EmptyState
        icon={HeartIcon}
        title="No saved shops yet"
        description="Tap the heart on a shop to keep it here for next time."
        action={
          <Button asChild>
            <Link to="/explore">Explore shops</Link>
          </Button>
        }
        bordered
      />
    )
  } else {
    content = (
      <ul aria-label="Saved shops" className={gridClass}>
        {favorites.data.map((shop) => (
          <li key={shop.id}>
            <ShopCard
              shop={shop}
              category={categories.data?.find((category) => category.id === shop.categoryIds[0])}
              variant="feature"
              headingLevel="h2"
            />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-5">
      <ScreenHeader title="Favorites" description="Shops you’ve saved, most recent first." />
      {content}
      <RecommendedRow
        title="You might also like"
        headingId="also-like-heading"
        position={position}
        actions={
          position ? null : (
            <Button asChild variant="link" className="px-0">
              <Link to="/">Set your location</Link>
            </Button>
          )
        }
      />
    </div>
  )
}
