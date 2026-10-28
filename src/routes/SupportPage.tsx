import { CircleCheckIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { Container } from '@/components/shared/Container'
import { MockNotice } from '@/components/shared/MockNotice'
import { Panel } from '@/components/shared/Panel'
import { ScreenHeader } from '@/components/shared/ScreenHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { legalDocuments } from '@/config/legal'
import { useSession } from '@/features/auth/api/queries'
import { signInHref, signUpHref } from '@/features/auth/links'
import { useMyBookingsQuery } from '@/features/booking/api/queries'
import { useShopQuery } from '@/features/shops/api/queries'
import { SupportRequestForm } from '@/features/support/components/SupportRequestForm'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { supportTopics } from '@/schemas/support'
import type { SupportRequestReceipt } from '@/services/support.service'

const linkClass = 'font-medium text-primary underline-offset-4 hover:underline'

function Tip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="space-y-0.5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm text-pretty text-muted-foreground">{children}</p>
    </li>
  )
}

/** Quicker routes than a support request, and the policies a request is judged against. */
function BeforeYouWrite() {
  return (
    <div className="space-y-6">
      <Panel title="Quicker ways">
        <ul className="space-y-4">
          <Tip title="Change or cancel a booking">
            Open it in{' '}
            <Link to="/bookings" className={linkClass}>
              My bookings
            </Link>
            , or message the shop from there.
          </Tip>
          <Tip title="A message that worries you">
            Open the conversation in your{' '}
            <Link to="/inbox" className={linkClass}>
              inbox
            </Link>{' '}
            and choose Report. We’ll see the whole conversation.
          </Tip>
          <Tip title="Can’t sign in">
            <Link to="/auth/forgot-password" className={linkClass}>
              Reset your password
            </Link>
            . If the email doesn’t arrive, check your spam folder.
          </Tip>
        </ul>
      </Panel>
      <Panel title="Policies">
        <ul className="space-y-2 text-sm">
          {Object.values(legalDocuments).map((document) => (
            <li key={document.href}>
              <Link to={document.href} className={linkClass}>
                {document.title}
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function RequestSent({ email, onAnother }: { email: string; onAnother: () => void }) {
  return (
    <Panel title="Request sent">
      <div className="flex gap-3">
        <CircleCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success-emphasis" />
        <p className="text-pretty">
          A person on the Dapita team will read it and reply by email to{' '}
          <span className="font-semibold break-all">{email}</span>.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" shape="pill" onClick={onAnother}>
          Send another request
        </Button>
        <Button asChild shape="pill">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </Panel>
  )
}

function SignInFirst() {
  const location = useLocation()
  const here = `${location.pathname}${location.search}`
  return (
    <Panel
      title="Sign in to contact support"
      description="We reply by email, and with your account we can see the booking or listing your request is about."
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild shape="pill">
          <Link to={signInHref(here)}>Sign in</Link>
        </Button>
        <Button asChild variant="outline" shape="pill">
          <Link to={signUpHref(here)}>Create an account</Link>
        </Button>
      </div>
    </Panel>
  )
}

/** Signed in: the form, with the shop to report and the person's bookings loaded first. */
function SupportRequest({ email }: { email: string }) {
  const [searchParams] = useSearchParams()
  const requested = searchParams.get('topic')
  const defaultTopic = supportTopics.find((topic) => topic === requested)
  const shopSlug = searchParams.get('shop') ?? ''
  const shop = useShopQuery(shopSlug, { enabled: Boolean(shopSlug) })
  const bookings = useMyBookingsQuery()
  const [sent, setSent] = useState<SupportRequestReceipt>()
  // A new key gives a fresh, empty form for another request.
  const [formKey, setFormKey] = useState(0)

  if (sent) {
    return (
      <RequestSent
        email={email}
        onAnother={() => {
          setSent(undefined)
          setFormKey((key) => key + 1)
        }}
      />
    )
  }
  // A shop that can't be loaded just isn't preselected; the form explains how to report one.
  if ((shopSlug && shop.isPending) || bookings.isPending) {
    return <Skeleton aria-hidden="true" className="h-96 rounded-3xl" />
  }
  if (bookings.isError) {
    return (
      <ErrorState
        title="We couldn’t load the form"
        error={bookings.error}
        onRetry={() => void bookings.refetch()}
        isRetrying={bookings.isRefetching}
      />
    )
  }
  return (
    <Panel title="Send a request">
      <SupportRequestForm
        key={formKey}
        defaultTopic={defaultTopic}
        defaultBookingId={searchParams.get('booking') ?? undefined}
        shop={shopSlug ? shop.data : undefined}
        bookings={bookings.data.toReversed()}
        onSent={setSent}
      />
    </Panel>
  )
}

/** Contact support and report listings, prices and booking disputes (ADM-03, doc §13.4). */
export default function SupportPage() {
  useDocumentTitle('Support')
  const session = useSession()

  return (
    <Container className="space-y-4 py-page">
      <Breadcrumbs className="hidden md:block" minItems={2} />
      <ScreenHeader
        title="Support"
        description="Tell us what went wrong. A person on the Dapita team reads every request."
        backTo="/"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-4">
          {session.isPending ? (
            <Skeleton aria-hidden="true" className="h-60 rounded-3xl" />
          ) : session.user ? (
            <SupportRequest email={session.user.email} />
          ) : (
            <SignInFirst />
          )}
          <MockNotice>Requests are saved in this browser only. Nobody is emailed.</MockNotice>
        </div>
        <BeforeYouWrite />
      </div>
    </Container>
  )
}
