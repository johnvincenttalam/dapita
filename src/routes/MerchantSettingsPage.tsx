import { ChevronRightIcon, LogOutIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { MockNotice } from '@/components/shared/MockNotice'
import { PageHeader } from '@/components/shared/PageHeader'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyProfileQuery } from '@/features/account/api/queries'
import { ProfileForm } from '@/features/account/components/ProfileForm'
import { useSignOutMutation } from '@/features/auth/api/queries'
import { useCurrentBusinessId } from '@/features/booking/api/merchant-queries'
import { useNotificationSettingsQuery } from '@/features/merchant/api/settings-queries'
import { NotificationSettingsForm } from '@/features/merchant/components/NotificationSettingsForm'
import { useDocumentTitle } from '@/hooks/use-document-title'

const elsewhere = [
  {
    to: '/business/profile?tab=hours',
    title: 'Hours, closures and policies',
    description: 'In Business profile, with your listing details.',
  },
  {
    to: '/account/privacy',
    title: 'Agreements, your data and account deletion',
    description: 'The terms and merchant policy you accepted, and your data requests.',
  },
]

/**
 * Settings (§9.2): the owner's own account and which emails they get. Business details,
 * hours and policies live in Business profile; team roles arrive with Staff (P1).
 */
export default function MerchantSettingsPage() {
  useDocumentTitle('Settings')
  const navigate = useNavigate()
  const businessId = useCurrentBusinessId()
  const profile = useMyProfileQuery()
  const notifications = useNotificationSettingsQuery(businessId)
  const signOut = useSignOutMutation()

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Your account, and how Dapita keeps you posted." />

      <Panel title="Your account">
        {profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => void profile.refetch()} isRetrying={profile.isRefetching} />
        ) : !profile.data ? (
          <Skeleton aria-hidden="true" className="h-48 rounded-2xl" />
        ) : (
          <>
            <ProfileForm key={profile.data.id} profile={profile.data} />
            <dl className="space-y-1 border-t border-border/70 pt-4">
              <dt className="text-sm text-muted-foreground">Sign-in email</dt>
              <dd className="font-medium break-all">{profile.data.email}</dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" shape="pill">
                <Link to="/auth/forgot-password">Reset password</Link>
              </Button>
              <Button
                variant="ghost"
                shape="pill"
                loading={signOut.isPending}
                onClick={() => signOut.mutate(undefined, { onSuccess: () => void navigate('/') })}
              >
                {!signOut.isPending && <LogOutIcon aria-hidden="true" />}
                Sign out
              </Button>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Email notifications" description="What Dapita emails you about your shop.">
        <MockNotice>This prototype doesn’t send emails. Your choices are saved for when it does.</MockNotice>
        {notifications.isError ? (
          <ErrorState
            error={notifications.error}
            onRetry={() => void notifications.refetch()}
            isRetrying={notifications.isRefetching}
          />
        ) : !notifications.data || !businessId ? (
          <Skeleton aria-hidden="true" className="h-56 rounded-2xl" />
        ) : (
          <NotificationSettingsForm businessId={businessId} settings={notifications.data} />
        )}
      </Panel>

      <Panel title="More settings">
        <ul className="-mx-2 divide-y divide-border/70">
          {elsewhere.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-center gap-3 rounded-xl px-2 py-3 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.title}</span>
                  <span className="block text-sm text-muted-foreground">{item.description}</span>
                </span>
                <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
