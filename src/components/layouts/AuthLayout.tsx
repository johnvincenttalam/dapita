import { Outlet } from 'react-router'

import { BrandPhoto } from '@/components/shared/BrandPhoto'
import { Logo } from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { brand } from '@/config/brand'
import { brandPhotos } from '@/config/brand-photos'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'

interface AuthLayoutProps {
  /** Show the branding panel on large screens. */
  showBrandPanel?: boolean
}

/**
 * Sign-in, sign-up and onboarding pages. The brand panel follows the welcome screen
 * (design screen 1): a photo with the logo, tagline and headline on top.
 */
export function AuthLayout({ showBrandPanel = true }: AuthLayoutProps) {
  return (
    <div className={cn('grid min-h-svh', showBrandPanel && 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]')}>
      {showBrandPanel ? (
        <aside
          aria-label={`About ${env.appName}`}
          // `light` keeps white text on the photo in dark mode too.
          className="light relative hidden flex-col justify-between overflow-hidden bg-brand-deep p-10 text-primary-foreground lg:flex xl:p-14"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <BrandPhoto photo={brandPhotos.authPanel} sizes="46vw" className="size-full object-[50%_30%]" />
            {/* Darker behind the logo (top) and the headline (bottom). */}
            <div className="absolute inset-0 bg-linear-to-b from-brand-deep/85 via-brand-deep/10 via-35% to-brand-deep/95 to-80%" />
          </div>
          <div className="relative space-y-3">
            <Logo inverted size="lg" />
            <p className="text-sm font-medium opacity-90">{brand.tagline}</p>
          </div>
          <div className="relative space-y-4">
            <p className="font-display text-5xl leading-[1.08] font-semibold tracking-tight text-balance xl:text-6xl">
              Look Good
              <br />
              Feel Good
              <br />
              Do More
            </p>
            <p className="max-w-sm text-sm opacity-85">
              Find, compare and book trusted local providers across Davao City.
            </p>
          </div>
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6">
          <Logo className={cn(showBrandPanel && 'lg:invisible')} />
          <ThemeToggle />
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 items-start justify-center px-4 pt-4 pb-12 outline-none sm:items-center sm:px-6 sm:pt-0"
        >
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
