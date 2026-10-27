import { Link, useSearchParams } from 'react-router'

import { MockNotice } from '@/components/shared/MockNotice'
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader'
import { CustomerSignUpForm } from '@/features/auth/components/SignUpForms'
import { businessSignUpHref, signInHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getSafeRedirect } from '@/lib/roles'

const linkClass = 'font-medium text-primary underline-offset-4 hover:underline'

/** Customer sign-up (CUS-06). Keeps `next`, so a guest who started booking returns to it. */
export default function SignUpPage() {
  useDocumentTitle('Create your account')
  const [searchParams] = useSearchParams()
  const next = getSafeRedirect(searchParams.get('next'))

  return (
    <div className="space-y-8">
      <AuthPageHeader
        title="Create your account"
        description="Book appointments and keep track of your requests in one place."
      />
      <CustomerSignUpForm next={next ?? '/'} />
      <div className="space-y-2 text-center text-sm text-muted-foreground">
        <p>
          Already have an account?{' '}
          <Link to={signInHref(next)} className={linkClass}>
            Sign in
          </Link>
        </p>
        <p>
          Own a salon, spa or barbershop?{' '}
          <Link to={businessSignUpHref()} className={linkClass}>
            Create a business account
          </Link>
        </p>
      </div>
      <MockNotice>Your account is saved in this browser only. No email is sent.</MockNotice>
    </div>
  )
}
