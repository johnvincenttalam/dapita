import { Link } from 'react-router'

import { MockNotice } from '@/components/shared/MockNotice'
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader'
import { BusinessSignUpForm } from '@/features/auth/components/SignUpForms'
import { BUSINESS_ONBOARDING_PATH, signInHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { env } from '@/lib/env'

const setupSteps = [
  { title: 'Create your account', text: 'Your name, shop name and how to reach you.' },
  { title: 'Set up your shop', text: 'Hours, services and prices. We suggest the usual ones.' },
  { title: `${env.appName} checks it`, text: 'Then customers can find and book you.' },
]

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
        description={`Three short steps, and you can stop and come back any time. Nothing is public until the ${env.appName} team checks it.`}
      />
      <ol aria-label="How it works" className="grid gap-3 text-sm sm:grid-cols-3">
        {setupSteps.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-2xl bg-muted/60 p-3 sm:flex-col sm:gap-2">
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums"
            >
              {index + 1}
            </span>
            <span>
              <span className="block font-medium">{step.title}</span>
              <span className="block text-muted-foreground">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
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
