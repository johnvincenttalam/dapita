import { CalendarPlusIcon, ClockIcon, ScissorsLineDashedIcon, TagIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { Container } from '@/components/shared/Container'
import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { categoryIconFor } from '@/config/category-icons'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { useShopQuery, useShopServicesQuery, useShopStaffQuery } from '@/features/shops/api/queries'
import { OpenStatusText } from '@/features/shops/components/OpenStatusText'
import { BookingMethodNote, ShopPolicies } from '@/features/shops/components/ShopPolicies'
import { bookingHref, serviceHref, shopHref } from '@/features/shops/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatDuration, formatPrice } from '@/lib/format'

function Fact({ icon: Icon, label, value }: { icon: typeof ClockIcon; label: string; value: ReactNode }) {
  return (
    // A <dl> group may hold only <dt> and <dd>, so the icon sits inside the term.
    <div className="relative flex min-h-10 flex-col justify-center pl-13">
      <dt className="text-xs text-muted-foreground">
        <span className="absolute top-1/2 left-0 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        {label}
      </dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}

/** One service: price, duration, requirements and the booking action (doc §9.1, CUS-05). */
export default function ServicePage() {
  const { shopSlug = '', serviceId = '' } = useParams()
  const shop = useShopQuery(shopSlug)
  const services = useShopServicesQuery(shopSlug)
  const staff = useShopStaffQuery(shopSlug)
  const categories = useCategoriesQuery()
  const service = services.data?.find((candidate) => candidate.id === serviceId)
  const category = categories.data?.find((candidate) => candidate.id === service?.categoryId)
  const providers = (staff.data ?? []).filter((member) => member.serviceIds.includes(serviceId))
  useDocumentTitle(service && shop.data ? `${service.name} at ${shop.data.name}` : 'Service')

  const isPending = shop.isPending || services.isPending
  const error = shop.error ?? services.error

  return (
    <Container className="space-y-5 py-page">
      <Breadcrumbs
        className="hidden md:block"
        minItems={2}
        labels={{ [shopHref(shopSlug)]: shop.data?.name, [serviceHref(shopSlug, serviceId)]: service?.name }}
      />

      {isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="mx-auto h-7 w-48 md:mx-0" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : error ? (
        <ErrorState
          title="We couldn’t load this service"
          error={error}
          onRetry={() => void Promise.all([shop.refetch(), services.refetch()])}
        />
      ) : !service || !shop.data ? (
        <>
          <ScreenHeader title="Service not found" backTo={shopHref(shopSlug)} />
          <EmptyState
            icon={ScissorsLineDashedIcon}
            title="This service isn’t offered any more"
            description="The shop may have updated its menu."
            action={
              <Button asChild>
                <Link to={`${shopHref(shopSlug)}?tab=services`}>See all services</Link>
              </Button>
            }
          />
        </>
      ) : (
        <>
          <ScreenHeader title={service.name} backTo={shopHref(shopSlug)} />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
            <div className="min-w-0 space-y-8">
              <div className="flex flex-col gap-5 rounded-3xl card-surface p-5 sm:flex-row sm:items-center">
                <ImageWithFallback
                  src={service.photoUrl}
                  alt=""
                  icon={categoryIconFor(category)}
                  className="aspect-video w-full rounded-2xl sm:aspect-square sm:size-32"
                />
                <div className="min-w-0 space-y-4">
                  <p className="text-sm">
                    at{' '}
                    <Link
                      to={shopHref(shopSlug)}
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {shop.data.name}
                    </Link>
                    <span className="text-muted-foreground"> · {shop.data.area.name}</span>
                  </p>
                  <dl className="flex flex-wrap gap-x-6 gap-y-3">
                    <Fact icon={TagIcon} label="Price" value={formatPrice(service.price)} />
                    <Fact icon={ClockIcon} label="Duration" value={formatDuration(service.durationMinutes)} />
                  </dl>
                </div>
              </div>

              {service.description ? (
                <section className="space-y-2">
                  <h2 className="type-heading">About this service</h2>
                  <p className="text-pretty text-muted-foreground">{service.description}</p>
                </section>
              ) : null}

              {service.requirements ? (
                <section className="space-y-2">
                  <h2 className="type-heading">Before you book</h2>
                  <p className="text-pretty text-muted-foreground">{service.requirements}</p>
                </section>
              ) : null}

              {providers.length ? (
                <section className="space-y-2">
                  <h2 className="type-heading">Who offers it</h2>
                  <p className="text-muted-foreground">
                    {providers.map((member) => member.displayName).join(', ')}. You can pick someone or let the shop
                    choose.
                  </p>
                </section>
              ) : null}

              <BookingMethodNote method={shop.data.bookingMethod} />

              <section className="space-y-3">
                <h2 className="type-heading">Policies</h2>
                <ShopPolicies policies={shop.data.policies} />
              </section>
            </div>

            <aside
              aria-label="Book"
              className="fixed inset-x-0 bottom-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))] z-30 border-t border-border/70 bg-background/95 p-3 backdrop-blur md:bottom-0 lg:static lg:border-0 lg:bg-transparent lg:p-0"
            >
              <div className="mx-auto flex max-w-lg items-center gap-3 lg:sticky lg:top-24 lg:max-w-none lg:flex-col lg:items-stretch lg:rounded-3xl lg:card-surface lg:p-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{formatPrice(service.price)}</p>
                  <OpenStatusText hours={shop.data.hours} closures={shop.data.closures} className="text-xs" />
                </div>
                <Button asChild size="xl" shape="pill" className="shrink-0">
                  <Link to={bookingHref(shopSlug, service.id)}>
                    <CalendarPlusIcon aria-hidden="true" />
                    Book this service
                  </Link>
                </Button>
              </div>
            </aside>
          </div>
          {/* Keeps the last section clear of the fixed booking bar below `lg`. */}
          <div aria-hidden="true" className="h-20 lg:hidden" />
        </>
      )}
    </Container>
  )
}
