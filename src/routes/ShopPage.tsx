import { CalendarPlusIcon, ChevronLeftIcon, StoreIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { Container } from '@/components/shared/Container'
import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { categoryIconFor } from '@/config/category-icons'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { MessageShopButton } from '@/features/messaging/components/MessageShopButton'
import { useShopQuery, useShopServicesQuery, useShopStaffQuery } from '@/features/shops/api/queries'
import { OpenStatusText } from '@/features/shops/components/OpenStatusText'
import { OpeningHoursList } from '@/features/shops/components/OpeningHoursList'
import { ShareButton } from '@/features/shops/components/ShareButton'
import { ShopHeader } from '@/features/shops/components/ShopHeader'
import { ShopLocation } from '@/features/shops/components/ShopLocation'
import { BookingMethodNote, ShopPolicies } from '@/features/shops/components/ShopPolicies'
import { ShopServicesList } from '@/features/shops/components/ShopServicesList'
import { ShopStaffList } from '@/features/shops/components/ShopStaffList'
import { bookingHref, shopHref } from '@/features/shops/links'
import { supportHref } from '@/features/support/links'
import { useBackNavigation } from '@/hooks/use-back-navigation'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { ApiError } from '@/lib/api-client'
import { formatPeso } from '@/lib/format'
import type { Service, ShopDetails, StaffMember } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

type Tab = 'overview' | 'services' | 'staff'

const tabTriggerClass = 'flex-none px-0'

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

interface ShopProfileProps {
  shop: ShopDetails
  services?: Service[]
  staff: StaffMember[]
  categories: ServiceCategory[]
  servicesError: boolean
}

function ShopProfile({ shop, services, staff, categories, servicesError }: ShopProfileProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const goBack = useBackNavigation('/explore')
  const requested = searchParams.get('tab')
  const tab: Tab = requested === 'services' ? 'services' : requested === 'staff' && staff.length ? 'staff' : 'overview'
  const setTab = (next: string) => setSearchParams(next === 'overview' ? {} : { tab: next }, { replace: true })

  const primaryCategory = categories.find((category) => category.id === shop.categoryIds[0])
  const cover = shop.photos.find((photo) => photo.kind === 'cover')
  const gallery = shop.photos.filter((photo) => photo.kind === 'gallery')
  const featured = services?.filter((service) => service.featured).slice(0, 3)
  const highlights = featured?.length ? featured : services?.slice(0, 3)

  const servicesFallback = servicesError ? (
    <p className="text-sm text-muted-foreground">Services couldn’t be loaded. Refresh the page to try again.</p>
  ) : (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
      <div className="min-w-0">
        <div className="relative -mx-4 sm:-mx-6 md:mx-0">
          <ImageWithFallback
            src={cover?.url}
            srcSet={cover?.srcSet}
            sizes="(min-width: 1024px) 860px, 100vw"
            // The page's largest element: fetch it first rather than lazily.
            priority
            alt={cover?.alt ?? ''}
            icon={categoryIconFor(primaryCategory)}
            className="aspect-16/10 w-full md:aspect-21/9 md:rounded-3xl"
          />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between">
            <Button
              variant="secondary"
              size="icon"
              shape="pill"
              aria-label="Back"
              onClick={goBack}
              className="bg-card/90 shadow-sm backdrop-blur hover:bg-card md:invisible"
            >
              <ChevronLeftIcon aria-hidden="true" />
            </Button>
            <ShareButton title={shop.name} />
          </div>
        </div>

        <div className="relative -mx-4 -mt-6 rounded-t-3xl bg-background px-4 pt-5 sm:-mx-6 sm:px-6 md:mx-0 md:mt-6 md:rounded-none md:px-0 md:pt-0">
          <ShopHeader shop={shop} categories={categories} />
          <MessageShopButton businessId={shop.id} className="mt-4 lg:hidden" />

          <Tabs value={tab} onValueChange={setTab} className="mt-5 gap-5">
            <TabsList variant="line" className="h-auto w-full justify-start gap-6 border-b border-border/70 pb-0">
              <TabsTrigger value="overview" className={tabTriggerClass}>
                Overview
              </TabsTrigger>
              <TabsTrigger value="services" className={tabTriggerClass}>
                Services
              </TabsTrigger>
              {staff.length ? (
                <TabsTrigger value="staff" className={tabTriggerClass}>
                  Staff
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <p className="text-pretty text-muted-foreground">{shop.description}</p>

              {gallery.length ? (
                <ul aria-label="Photos" className="grid grid-cols-4 gap-2">
                  {gallery.slice(0, 4).map((photo) => (
                    <li key={photo.id}>
                      <ImageWithFallback src={photo.url} alt={photo.alt} className="aspect-square w-full rounded-xl" />
                    </li>
                  ))}
                </ul>
              ) : null}

              <Section
                title="Featured services"
                action={
                  <Button variant="link" className="px-0" onClick={() => setTab('services')}>
                    See all
                  </Button>
                }
              >
                {highlights ? (
                  <ShopServicesList services={highlights} shopSlug={shop.slug} categories={categories} />
                ) : (
                  servicesFallback
                )}
              </Section>

              <BookingMethodNote method={shop.bookingMethod} />

              <Section title="Opening hours">
                <OpeningHoursList hours={shop.hours} closures={shop.closures} />
              </Section>

              <Section title="Location">
                <ShopLocation shop={shop} />
              </Section>

              <Section title="Policies">
                <ShopPolicies policies={shop.policies} />
              </Section>

              <p className="text-sm text-muted-foreground">
                Something wrong with this listing?{' '}
                <Link
                  to={supportHref('listing', { shop: shop.slug })}
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Report this listing
                </Link>
              </p>
            </TabsContent>

            <TabsContent value="services">
              {services ? (
                services.length ? (
                  <ShopServicesList services={services} shopSlug={shop.slug} categories={categories} grouped />
                ) : (
                  <p className="text-sm text-muted-foreground">This shop hasn’t listed any services yet.</p>
                )
              ) : (
                servicesFallback
              )}
            </TabsContent>

            {staff.length ? (
              <TabsContent value="staff">
                <ShopStaffList staff={staff} />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>
      </div>

      <aside aria-label="Book" className="hidden lg:block">
        <div className="sticky top-24 space-y-4 rounded-3xl card-surface p-6">
          <div className="space-y-1">
            {shop.priceFrom !== undefined ? (
              <p className="text-sm text-muted-foreground">
                Services from{' '}
                <span className="text-lg font-semibold text-foreground">{formatPeso(shop.priceFrom)}</span>
              </p>
            ) : null}
            <OpenStatusText hours={shop.hours} closures={shop.closures} withIcon />
          </div>
          <Button asChild size="xl" shape="pill" fullWidth>
            <Link to={bookingHref(shop.slug)}>
              <CalendarPlusIcon aria-hidden="true" />
              Book appointment
            </Link>
          </Button>
          <MessageShopButton businessId={shop.id} fullWidth />
          <p className="text-xs text-pretty text-muted-foreground">
            {shop.bookingMethod === 'request'
              ? 'You’ll send a request. The shop confirms the time before it’s booked.'
              : 'Times shown are live availability.'}
          </p>
        </div>
      </aside>
    </div>
  )
}

function ShopPageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="-mx-4 aspect-16/10 rounded-none sm:-mx-6 md:mx-0 md:aspect-21/9 md:rounded-3xl" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

/** Public shop profile (design screen 5, CUS-05). */
export default function ShopPage() {
  const { shopSlug = '' } = useParams()
  const shop = useShopQuery(shopSlug)
  const services = useShopServicesQuery(shopSlug)
  const staff = useShopStaffQuery(shopSlug)
  const categories = useCategoriesQuery()
  useDocumentTitle(shop.data?.name ?? 'Shop')

  let content: ReactNode
  const framed = (state: ReactNode) => <div className="pt-page md:pt-0">{state}</div>
  if (shop.isPending) {
    content = <ShopPageSkeleton />
  } else if (shop.isError) {
    content = framed(
      shop.error instanceof ApiError && shop.error.status === 404 ? (
        <>
          <ScreenHeader title="Shop not found" backTo="/explore" />
          <EmptyState
            icon={StoreIcon}
            title="This shop isn’t available"
            description="It may have moved, closed, or not be listed yet."
            action={
              <Button asChild>
                <Link to="/explore">Explore other shops</Link>
              </Button>
            }
          />
        </>
      ) : (
        <ErrorState
          title="We couldn’t load this shop"
          error={shop.error}
          onRetry={() => void shop.refetch()}
          isRetrying={shop.isRefetching}
        />
      ),
    )
  } else {
    content = (
      <ShopProfile
        shop={shop.data}
        services={services.data}
        servicesError={services.isError}
        staff={staff.data ?? []}
        categories={categories.data ?? []}
      />
    )
  }

  return (
    <Container className="space-y-4 pb-page md:pt-page">
      <Breadcrumbs className="hidden md:block" minItems={2} labels={{ [shopHref(shopSlug)]: shop.data?.name }} />
      {content}
    </Container>
  )
}
