import { Link } from 'react-router'

import { MockNotice } from '@/components/shared/MockNotice'
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader'
import { BusinessSignUpForm } from '@/features/auth/components/SignUpForms'
import { BUSINESS_ONBOARDING_PATH, signInHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { env } from '@/lib/env'

/**
 * Merchant account creation (MER-01, doc §7.4). The owner creates an account and verifies
 * it; the listing details follow in onboarding, and the listing stays private until reviewed.
 */
export default function BusinessSignUpPage() {
  useDocumentTitle('List your business')

  return (
    <div className="space-y-8">
      <AuthPageHeader
        title="List your business"
        description={`Create your owner account first. Next you’ll add your services, hours and photos. Your listing stays private until the ${env.appName} team reviews it.`}
      />
      <BusinessSignUpForm next={BUSINESS_ONBOARDING_PATH} />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={signInHref('/business')} className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      <MockNotice>
        Your account is saved in this browser only. No email is sent and no one reviews the business.
      </MockNotice>
    </div>
  )
}
