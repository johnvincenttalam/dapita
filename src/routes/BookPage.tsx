import { MapPinIcon, StoreIcon } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { Container } from '@/components/shared/Container'
import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { market } from '@/config/market'
import { BookingRequestForm } from '@/features/booking/components/BookingRequestForm'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { useShopQuery, useShopServicesQuery, useShopStaffQuery } from '@/features/shops/api/queries'
import { OpenStatusText } from '@/features/shops/components/OpenStatusText'
import { BookingMethodNote } from '@/features/shops/components/ShopPolicies'
import { ShopServicesList } from '@/features/shops/components/ShopServicesList'
import { shopHref } from '@/features/shops/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApiError } from '@/lib/api-client'
import type { ShopDetails } from '@/types/business'

/** Which shop the customer is booking with: a compact row on phones, a sticky card beside the menu on desktop. */
function ShopContext({ shop }: { shop: ShopDetails }) {
  const cover = shop.photos.find((photo) => photo.kind === 'cover')

  return (
    <aside aria-label="Shop" className="lg:col-start-2 lg:row-start-1">
      <div className="flex items-center gap-3 rounded-2xl card-surface p-3 lg:sticky lg:top-24 lg:flex-col lg:items-stretch lg:gap-4 lg:rounded-3xl lg:p-5">
        <ImageWithFallback
          src={cover?.url}
          alt=""
          icon={StoreIcon}
          className="size-16 shrink-0 rounded-xl lg:aspect-16/10 lg:size-auto lg:w-full lg:rounded-2xl"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-pretty">
            <Link to={shopHref(shop.slug)} className="underline-offset-4 hover:underline">
              {shop.name}
            </Link>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">
              {shop.area.name}, {market.city}
            </span>
          </p>
          <OpenStatusText hours={shop.hours} closures={shop.closures} withIcon />
        </div>
        <div className="hidden lg:block">
          <BookingMethodNote method={shop.bookingMethod} />
        </div>
      </div>
    </aside>
  )
}

/** Book appointment (design screen 6). Customers only; guests are sent to sign in first. */
export default function BookPage() {
  const { shopSlug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const shop = useShopQuery(shopSlug)
  const services = useShopServicesQuery(shopSlug)
  const staff = useShopStaffQuery(shopSlug)
  const categories = useCategoriesQuery()
  useDocumentTitle(shop.data ? `Book at ${shop.data.name}` : 'Book appointment')

  const service = services.data?.find((candidate) => candidate.id === searchParams.get('service'))
  const error = shop.error ?? services.error ?? staff.error

  let content
  if (shop.isPending || services.isPending || staff.isPending) {
    content = (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-22 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  } else if (error) {
    content =
      error instanceof ApiError && error.status === 404 ? (
        <EmptyState
          icon={StoreIcon}
          title="This shop isn’t taking requests"
          description="It may have moved, closed, or not be listed yet."
          action={
            <Button asChild>
              <Link to="/explore">Explore other shops</Link>
            </Button>
          }
        />
      ) : (
        <ErrorState
          title="We couldn’t load the booking form"
          error={error}
          onRetry={() => void Promise.all([shop.refetch(), services.refetch(), staff.refetch()])}
        />
      )
  } else if (shop.data && service) {
    content = (
      <BookingRequestForm
        // A new service starts a fresh form (times depend on its duration).
        key={service.id}
        shop={shop.data}
        service={service}
        staff={staff.data ?? []}
        category={categories.data?.find((candidate) => candidate.id === service.categoryId)}
      />
    )
  } else {
    content = (
      // Same columns as the booking form, so the page keeps its shape after a service is picked.
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        {shop.data ? <ShopContext shop={shop.data} /> : null}
        <section aria-labelledby="choose-service" className="min-w-0 space-y-3 lg:row-start-1">
          <h2 id="choose-service" className="type-heading">
            Choose a service
          </h2>
          {searchParams.get('service') ? (
            <p className="text-sm text-muted-foreground">That service isn’t offered any more. Pick another one.</p>
          ) : null}
          <div className="rounded-3xl card-surface px-4 py-3 sm:px-6 sm:py-5">
            <ShopServicesList
              services={services.data ?? []}
              shopSlug={shopSlug}
              categories={categories.data ?? []}
              grouped
            />
          </div>
        </section>
      </div>
    )
  }

  return (
    <Container className="space-y-5 py-page">
      <Breadcrumbs className="hidden md:block" minItems={2} labels={{ [shopHref(shopSlug)]: shop.data?.name }} />
      <ScreenHeader title="Book appointment" backTo={shopHref(shopSlug)} />
      {content}
    </Container>
  )
}
