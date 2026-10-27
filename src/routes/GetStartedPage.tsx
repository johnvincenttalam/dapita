import { ChevronLeftIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { brandPhotos } from '@/config/brand-photos'
import { AccountTypeCard } from '@/features/auth/components/AccountTypeCard'
import { businessSignUpHref, signInHref, signUpHref } from '@/features/auth/links'
import { useBackNavigation } from '@/hooks/use-back-navigation'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { env } from '@/lib/env'
import { getSafeRedirect } from '@/lib/roles'

/** Choose User Type (design screen 2). "Skip" goes back to browsing; guests can browse without an account (CUS-01). */
export default function GetStartedPage() {
  useDocumentTitle('Get started')
  const [searchParams] = useSearchParams()
  const next = getSafeRedirect(searchParams.get('next'))
  const goBack = useBackNavigation('/welcome')

  return (
    // From `md` up the choice sits in the middle of the screen instead of hugging the top.
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 px-4 py-4 md:max-w-3xl md:justify-center md:py-10">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={goBack} className="-ml-2">
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </Button>
        <Logo className="hidden md:flex" />
        <Button asChild variant="ghost" className="col-start-3 -mr-2 justify-self-end text-muted-foreground">
          <Link to={next ?? '/'}>Skip</Link>
        </Button>
      </div>

      <header className="space-y-2">
        <h1 className="type-title">How will you use {env.appName}?</h1>
        <p className="text-sm text-muted-foreground">Choose an account type to get started.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <AccountTypeCard
          to={signUpHref(next)}
          photo={brandPhotos.getStartedCustomer}
          title="I’m a Customer"
          description="Find and book beauty, grooming, wellness and lifestyle services near you."
        />
        <AccountTypeCard
          to={businessSignUpHref()}
          photo={brandPhotos.getStartedBusiness}
          title="I’m a Business Owner"
          description="List your business, manage bookings, and grow your customers."
        />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to={signInHref(next)} className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
