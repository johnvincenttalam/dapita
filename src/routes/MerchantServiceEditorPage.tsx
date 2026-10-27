import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentBusinessId } from '@/features/booking/api/merchant-queries'
import { useServiceMenuQuery } from '@/features/merchant/api/service-queries'
import { ServiceForm } from '@/features/merchant/components/ServiceForm'
import { useDocumentTitle } from '@/hooks/use-document-title'

/** `/business/services/new` and `/business/services/:serviceId` (MER-02). A page, not a dialog, so long forms work on phones. */
export default function MerchantServiceEditorPage() {
  const { serviceId } = useParams()
  const businessId = useCurrentBusinessId()
  const menu = useServiceMenuQuery(businessId)
  const service = serviceId ? menu.data?.services.find((candidate) => candidate.id === serviceId) : undefined
  const title = serviceId ? (service ? `Edit ${service.name}` : 'Edit service') : 'Add service'
  useDocumentTitle(title)

  if (menu.isError) {
    return <ErrorState error={menu.error} onRetry={() => void menu.refetch()} isRetrying={menu.isRefetching} />
  }
  if (!menu.data || !businessId) {
    return (
      <div className="max-w-2xl space-y-6" aria-hidden="true">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    )
  }
  if (serviceId && !service) {
    return (
      <ErrorState
        title="We couldn’t find that service."
        description="It may have been deleted, or the link is wrong."
        action={
          <Button asChild variant="outline" shape="pill">
            <Link to="/business/services">All services</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={
          service
            ? 'Changes apply to new bookings. Existing bookings keep the price and time agreed.'
            : 'Add it the way it appears on your price list.'
        }
      />
      <ServiceForm
        key={service?.id ?? 'new'}
        businessId={businessId}
        categories={menu.data.categories}
        service={service}
      />
    </div>
  )
}
