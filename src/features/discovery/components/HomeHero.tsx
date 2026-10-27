import { ArrowRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import { BrandPhoto } from '@/components/shared/BrandPhoto'
import { Button } from '@/components/ui/button'
import { brandPhotos } from '@/config/brand-photos'
import { market } from '@/config/market'

/**
 * The "Find Your Style" banner from design screen 3. The call to action promotes
 * booking instead of the P1 AI try-on (plan C4).
 */
export function HomeHero() {
  return (
    // `light` keeps white text on the photo in dark mode too.
    <section
      aria-labelledby="home-hero-title"
      className="light relative isolate overflow-hidden rounded-3xl bg-brand-deep p-6 text-primary-foreground shadow-md sm:p-8 md:p-12"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <BrandPhoto
          photo={brandPhotos.homeHero}
          sizes="(min-width: 1280px) 76rem, 100vw"
          className="size-full object-[65%_30%]"
        />
        {/* The green wash behind the text keeps it readable over the photo; the people stay clear on the right. */}
        <div className="absolute inset-0 bg-linear-to-r from-brand-deep/95 via-brand-deep/80 via-50% to-brand-deep/20 md:via-brand-deep/70 md:via-40% md:to-transparent md:to-75%" />
      </div>
      <div className="relative max-w-[62%] space-y-3 sm:max-w-md md:space-y-4">
        <h1 id="home-hero-title" className="font-display text-3xl leading-tight font-semibold text-balance md:text-5xl">
          Find Your Style
        </h1>
        <p className="text-base opacity-90 md:text-lg">
          Book your next look with trusted barbers, salons and spas in {market.city}.
        </p>
        <Button asChild shape="pill" size="lg" className="mt-2 bg-secondary text-foreground hover:bg-secondary/85">
          <Link to="/explore">
            Explore services
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
