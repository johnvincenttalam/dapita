import { Link, useNavigate, useSearchParams } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentBusinessId } from '@/features/booking/api/merchant-queries'
import { useBusinessProfileQuery } from '@/features/merchant/api/business-queries'
import { BusinessDetailsForm } from '@/features/merchant/components/profile/BusinessDetailsForm'
import { ClosuresPanel } from '@/features/merchant/components/profile/ClosuresPanel'
import { OpeningHoursForm } from '@/features/merchant/components/profile/OpeningHoursForm'
import { PoliciesForm } from '@/features/merchant/components/profile/PoliciesForm'
import { useDocumentTitle } from '@/hooks/use-document-title'

const tabs = [
  { value: 'details', label: 'Details' },
  { value: 'hours', label: 'Hours' },
  { value: 'closures', label: 'Closures' },
  { value: 'policies', label: 'Booking rules' },
] as const

type ProfileTab = (typeof tabs)[number]['value']

/**
 * Business profile (MER-01, MER-03, BKG-06). Each tab saves on its own, so changing
 * the hours never re-submits the description, and every save says what it changed.
 */
export default function MerchantProfilePage() {
  useDocumentTitle('Business profile')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: ProfileTab = tabs.some((item) => item.value === requested) ? (requested as ProfileTab) : 'details'
  const profile = useBusinessProfileQuery(useCurrentBusinessId())

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business profile"
        description="What customers see on your shop page, and when they can book."
        actions={
          profile.data ? (
            <Button asChild variant="outline" shape="pill">
              <Link to={`/shops/${encodeURIComponent(profile.data.business.slug)}`}>View shop page</Link>
            </Button>
          ) : null
        }
      />

      <Tabs
        value={tab}
        onValueChange={(next) =>
          void navigate(next === 'details' ? '/business/profile' : `/business/profile?tab=${next}`, { replace: true })
        }
        className="gap-6"
      >
        <TabsList variant="line" className="h-auto w-full justify-start border-b border-border/70 pb-0 md:w-fit">
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value} className="flex-1">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} isRetrying={profile.isRefetching} />
        ) : !profile.data ? (
          <div className="max-w-2xl" aria-hidden="true">
            <Skeleton className="h-96 rounded-3xl" />
          </div>
        ) : (
          <div className="max-w-2xl">
            <TabsContent value="details">
              <BusinessDetailsForm profile={profile.data} />
            </TabsContent>
            <TabsContent value="hours">
              <OpeningHoursForm business={profile.data.business} />
            </TabsContent>
            <TabsContent value="closures">
              <ClosuresPanel business={profile.data.business} />
            </TabsContent>
            <TabsContent value="policies">
              <PoliciesForm business={profile.data.business} />
            </TabsContent>
          </div>
        )}
      </Tabs>
    </div>
  )
}
