import { Link } from 'react-router'

import { BrandPhoto } from '@/components/shared/BrandPhoto'
import { LogoArtwork } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { brand } from '@/config/brand'
import { brandPhotos } from '@/config/brand-photos'
import { getStartedHref, signInHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { env } from '@/lib/env'

/**
 * Splash / Welcome (design screen 1): a portrait photo behind the logo and headline.
 * Phones match the design; larger screens split into text and photo. It looks the
 * same in both themes.
 */
export default function WelcomePage() {
  useDocumentTitle('Welcome')

  return (
    // `light` keeps the brand palette and white text on the photo in dark mode too.
    // Phones: the photo fills the screen behind the text. Wider screens: text left, photo right.
    <div className="light relative isolate flex min-h-svh flex-col overflow-hidden bg-brand-deep text-primary-foreground md:grid md:grid-cols-2">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 md:relative md:inset-auto md:z-auto md:order-last"
      >
        <BrandPhoto
          photo={brandPhotos.welcome}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="size-full object-[50%_25%] md:absolute md:inset-0"
        />
        {/* Darker at the top (logo) and bottom (headline, buttons); clear over her face. */}
        <div className="absolute inset-0 bg-linear-to-b from-brand-deep/90 via-brand-deep/10 via-35% to-brand-deep/95 to-80% md:hidden" />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-16 pb-10 md:pt-20">
        {/* Centred on phones (design screen 1); from `md` up it lines up with the headline below. */}
        <header className="space-y-3 text-center md:text-left">
          <h1>
            <LogoArtwork onDark sizes="(min-width: 768px) 174px, 232px" className="mx-auto h-24 md:mx-0 md:h-18" />
            <span className="sr-only">{env.appName}</span>
          </h1>
          <p className="text-sm font-medium text-balance opacity-90">{brand.tagline}</p>
        </header>

        <div className="mt-auto space-y-8 pt-16">
          <p className="font-display text-4xl leading-tight font-semibold md:text-5xl">
            Look Good
            <br />
            Feel Good
            <br />
            Do More
          </p>
          <div className="space-y-3">
            <Button
              asChild
              size="xl"
              shape="pill"
              fullWidth
              className="bg-background text-primary hover:bg-background/90"
            >
              <Link to={getStartedHref()}>Get Started</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="xl"
              shape="pill"
              fullWidth
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to={signInHref()}>Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
