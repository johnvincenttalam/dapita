import { BadgeCheckIcon, LogOutIcon, MailWarningIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { MockNotice } from '@/components/shared/MockNotice'
import { Panel } from '@/components/shared/Panel'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyProfileQuery } from '@/features/account/api/queries'
import { ProfileForm } from '@/features/account/components/ProfileForm'
import { useSignOutMutation } from '@/features/auth/api/queries'
import { verifyHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { formatFullDate } from '@/lib/format'

/** Customer profile: name and contact details, sign-in email and sign out (CUS-06). */
export default function ProfilePage() {
  useDocumentTitle('Profile')
  const profile = useMyProfileQuery()
  const signOut = useSignOutMutation()
  const navigate = useNavigate()

  return (
    <div className="space-y-5">
      <ScreenHeader title="Profile" description="Your name and contact details." />

      {profile.isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : profile.isError ? (
        <ErrorState
          title="We couldn’t load your profile"
          error={profile.error}
          onRetry={() => void profile.refetch()}
          isRetrying={profile.isRefetching}
        />
      ) : (
        <>
          <Panel title="Your details">
            <ProfileForm key={profile.data.id} profile={profile.data} />
          </Panel>

          <Panel title="Sign-in">
            <dl className="space-y-1">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium break-all">{profile.data.email}</span>
                {profile.data.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-sm text-success-emphasis">
                    <BadgeCheckIcon aria-hidden="true" className="size-4" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-warning-emphasis">
                    <MailWarningIcon aria-hidden="true" className="size-4" />
                    Not verified ·{' '}
                    <Link
                      to={verifyHref({ next: '/account' })}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Verify now
                    </Link>
                  </span>
                )}
              </dd>
            </dl>
            <p className="text-sm text-muted-foreground">
              Member since {formatFullDate(profile.data.createdAt)}. Changing your email isn’t available yet.
            </p>
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
          </Panel>

          <MockNotice>Changes are saved in this browser only.</MockNotice>
        </>
      )}
    </div>
  )
}
