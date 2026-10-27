import { Link } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { MockNotice } from '@/components/shared/MockNotice'
import { Panel } from '@/components/shared/Panel'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyConsentsQuery, useMyProfileQuery } from '@/features/account/api/queries'
import { AccountDeletionRequest } from '@/features/account/components/AccountDeletionRequest'
import { ConsentList } from '@/features/account/components/ConsentList'
import { legalDocuments } from '@/config/legal'
import { useDocumentTitle } from '@/hooks/use-document-title'

const linkClass = 'font-medium text-primary underline-offset-4 hover:underline'

/** Privacy & data: accepted documents, data requests and account deletion (CUS-06, doc §13.2). */
export default function PrivacyPage() {
  useDocumentTitle('Privacy & data')
  const profile = useMyProfileQuery()
  const consents = useMyConsentsQuery()

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Privacy & data"
        description="What you’ve agreed to, and how to get a copy of your data or delete your account."
      />

      <Panel title="Agreements">
        {consents.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : consents.isError ? (
          <ErrorState
            title="We couldn’t load your agreements"
            error={consents.error}
            onRetry={() => void consents.refetch()}
            isRetrying={consents.isRefetching}
          />
        ) : (
          <ConsentList consents={consents.data} />
        )}
      </Panel>

      <Panel title="Your data">
        <p className="text-sm text-pretty text-muted-foreground">
          The{' '}
          <Link to={legalDocuments.privacy_notice.href} className={linkClass}>
            privacy notice
          </Link>{' '}
          explains what we collect and why. You can correct your name and mobile number on your{' '}
          <Link to="/account" className={linkClass}>
            profile
          </Link>
          . To get a copy of your data or correct anything else,{' '}
          <Link to="/support" className={linkClass}>
            contact support
          </Link>
          .
        </p>
      </Panel>

      <Panel title="Delete your account">
        {profile.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : profile.isError ? (
          <ErrorState
            title="We couldn’t load your account"
            error={profile.error}
            onRetry={() => void profile.refetch()}
            isRetrying={profile.isRefetching}
          />
        ) : (
          <AccountDeletionRequest profile={profile.data} />
        )}
      </Panel>

      <MockNotice>Requests are saved in this browser only. Nothing is sent or deleted.</MockNotice>
    </div>
  )
}
