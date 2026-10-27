import { InfoIcon, PlusIcon, ScissorsIcon } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentBusinessId } from '@/features/booking/api/merchant-queries'
import { useServiceMenuQuery } from '@/features/merchant/api/service-queries'
import { ServiceMenuRow } from '@/features/merchant/components/ServiceMenuRow'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type { Service } from '@/types/business'
import type { ServiceCategory } from '@/types/catalog'

function CategorySection({ title, services, businessId }: { title: string; services: Service[]; businessId: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="type-heading">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {services.length} {services.length === 1 ? 'service' : 'services'}
        </p>
      </div>
      <ul className="divide-y divide-border/70 overflow-hidden rounded-3xl card-surface">
        {services.map((service, index) => (
          <ServiceMenuRow
            key={service.id}
            service={service}
            businessId={businessId}
            isFirst={index === 0}
            isLast={index === services.length - 1}
          />
        ))}
      </ul>
    </section>
  )
}

/** Menu groups in the business's category order; services under a retired category go last. */
function groupByCategory(services: Service[], categories: ServiceCategory[]) {
  const groups = categories
    .map((category) => ({
      key: category.id,
      title: category.name,
      services: services.filter((s) => s.categoryId === category.id),
    }))
    .filter((group) => group.services.length > 0)
  const known = new Set(categories.map((category) => category.id))
  const other = services.filter((service) => !known.has(service.categoryId))
  return other.length ? [...groups, { key: 'other', title: 'Other services', services: other }] : groups
}

/** Services (MER-02): the menu customers book from, in the order they see it. */
export default function MerchantServicesPage() {
  useDocumentTitle('Services')
  const businessId = useCurrentBusinessId()
  const menu = useServiceMenuQuery(businessId)
  const services = menu.data?.services ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Services"
        description="Your menu, in the order customers see it. Changes apply to new bookings; existing bookings keep the price agreed."
        actions={
          <>
            {menu.data?.shopSlug ? (
              <Button asChild variant="outline" shape="pill">
                <Link to={`/shops/${encodeURIComponent(menu.data.shopSlug)}`}>View shop page</Link>
              </Button>
            ) : null}
            <Button asChild shape="pill">
              <Link to="/business/services/new">
                <PlusIcon aria-hidden="true" />
                Add service
              </Link>
            </Button>
          </>
        }
      />

      {menu.isError ? (
        <ErrorState error={menu.error} onRetry={() => void menu.refetch()} isRetrying={menu.isRefetching} />
      ) : !menu.data || !businessId ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={ScissorsIcon}
          title="Add your first service"
          description="Customers can book once your menu has at least one service."
          bordered
          action={
            <Button asChild shape="pill">
              <Link to="/business/services/new">Add service</Link>
            </Button>
          }
        />
      ) : (
        <div className="max-w-3xl space-y-8">
          {services.every((service) => !service.active) ? (
            <Alert variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Every service is hidden, so customers can’t book anything. Show at least one.
              </AlertDescription>
            </Alert>
          ) : null}
          {groupByCategory(services, menu.data.categories).map((group) => (
            <CategorySection key={group.key} title={group.title} services={group.services} businessId={businessId} />
          ))}
        </div>
      )}
    </div>
  )
}
