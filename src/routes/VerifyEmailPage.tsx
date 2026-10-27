import { MailCheckIcon, MailIcon, MailXIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'

import { LoadingIndicator } from '@/components/feedback/LoadingIndicator'
import { Button } from '@/components/ui/button'
import { useSession, useVerifyEmailMutation } from '@/features/auth/api/queries'
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader'
import { MockVerificationLink } from '@/features/auth/components/MockVerificationLink'
import { signInHref, verifyHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getErrorMessage } from '@/lib/api-client'
import { defaultPathFor, getSafeRedirect } from '@/lib/roles'
import type { SessionUser } from '@/types/auth'

function ContinueButton({ to }: { to: string }) {
  return (
    <Button asChild size="xl" shape="pill" fullWidth>
      <Link to={to}>Continue</Link>
    </Button>
  )
}

/** Opened from the verification email: confirms the token once, then offers to continue. */
function ConfirmToken({ token, next }: { token: string; next: string | null }) {
  const { user } = useSession()
  const verify = useVerifyEmailMutation()
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    verify.mutate(token)
  }, [token, verify])

  if (verify.isError) {
    return (
      <div className="space-y-8">
        <AuthPageHeader icon={MailXIcon} title="This link didn’t work" description={getErrorMessage(verify.error)} />
        <ContinueButton to={user ? (next ?? defaultPathFor(user)) : signInHref(next)} />
      </div>
    )
  }
  if (!verify.isSuccess) return <LoadingIndicator label="Confirming your email…" />

  return (
    <div className="space-y-8">
      <AuthPageHeader
        icon={MailCheckIcon}
        title="Email verified"
        description={`Thanks. ${verify.data.email} is confirmed.`}
      />
      <ContinueButton to={user ? (next ?? defaultPathFor(user)) : signInHref(next)} />
    </div>
  )
}

/** After sign-up: asks the user to open the email, and lets them continue meanwhile. */
function CheckYourEmail({ user, next }: { user: SessionUser; next: string | null }) {
  const continueTo = next ?? defaultPathFor(user)

  if (user.emailVerified) {
    return (
      <div className="space-y-8">
        <AuthPageHeader
          icon={MailCheckIcon}
          title="Your email is verified"
          description={`${user.email} is confirmed.`}
        />
        <ContinueButton to={continueTo} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AuthPageHeader
        icon={MailIcon}
        title="Check your email"
        description={`We sent a verification link to ${user.email}. Open it to confirm your address.`}
      />
      <div className="space-y-3">
        <ContinueButton to={continueTo} />
        <p className="text-center text-sm text-muted-foreground">You can also verify later from your profile.</p>
      </div>
      <MockVerificationLink userId={user.id} next={next} />
    </div>
  )
}

/** Email verification (plan §2.2 `/auth/verify`, §8 item 6). */
export default function VerifyEmailPage() {
  useDocumentTitle('Verify your email')
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const next = getSafeRedirect(searchParams.get('next'))
  const { user, isPending } = useSession()

  if (token) return <ConfirmToken token={token} next={next} />
  if (isPending) return <LoadingIndicator label="Checking your session…" />
  if (!user) {
    return (
      <div className="space-y-8">
        <AuthPageHeader
          icon={MailIcon}
          title="Verify your email"
          description="Sign in to see your verification status."
        />
        <Button asChild size="xl" shape="pill" fullWidth>
          <Link to={signInHref(verifyHref({ next }))}>Sign in</Link>
        </Button>
      </div>
    )
  }
  return <CheckYourEmail user={user} next={next} />
}
