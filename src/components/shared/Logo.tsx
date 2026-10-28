import { Link } from 'react-router'

import logoOnDark480 from '@/assets/brand/dapita-logo-on-dark-480.webp'
import logoOnDark720 from '@/assets/brand/dapita-logo-on-dark-720.webp'
import logo480 from '@/assets/brand/dapita-logo-480.webp'
import logo720 from '@/assets/brand/dapita-logo-720.webp'
import { env } from '@/lib/env'
import { cn } from '@/lib/utils'

interface LogoProps {
  to?: string
  /** Show only the pin mark (e.g. a collapsed sidebar or the phone header). */
  compact?: boolean
  /** For use on primary-coloured or photographic surfaces: the cream-wordmark artwork. */
  inverted?: boolean
  /** For dark surfaces such as the merchant sidebar: the cream-wordmark artwork. */
  onDark?: boolean
  /** Small line under the wordmark, e.g. "for Business" in the merchant dashboard. */
  subtitle?: string
  size?: 'default' | 'lg'
  className?: string
}

/** Intrinsic size of the artwork files, so the browser reserves space before they load. */
const ARTWORK_SIZE = { width: 720, height: 298 }

/* WebP at two widths, made from the lossless PNGs in docs/brand: 480 px covers the header logos on any
   screen; 720 px is for the large welcome-screen logo. */
const artwork = {
  light: { src: logo720, srcSet: `${logo480} 480w, ${logo720} 720w` },
  onDark: { src: logoOnDark720, srcSet: `${logoOnDark480} 480w, ${logoOnDark720} 720w` },
}

/**
 * The supplied logo artwork (docs/brand/dapita-logo-source.png, trimmed). `onDark` is the copy
 * with a cream wordmark for green or dark surfaces; otherwise it follows the theme.
 * Decorative: callers give the accessible name.
 */
export function LogoArtwork({
  onDark,
  sizes = '140px',
  className,
}: {
  onDark?: boolean
  /** How wide the logo is shown, so the browser picks the smaller file when it can. */
  sizes?: string
  className?: string
}) {
  if (onDark) {
    return <img {...artwork.onDark} sizes={sizes} alt="" {...ARTWORK_SIZE} className={cn('w-auto', className)} />
  }
  // Lazy loading skips whichever copy the theme hides (`display: none`), so only one downloads.
  return (
    <>
      <img
        {...artwork.light}
        sizes={sizes}
        alt=""
        loading="lazy"
        {...ARTWORK_SIZE}
        className={cn('w-auto dark:hidden', className)}
      />
      <img
        {...artwork.onDark}
        sizes={sizes}
        alt=""
        loading="lazy"
        {...ARTWORK_SIZE}
        className={cn('hidden w-auto dark:block', className)}
      />
    </>
  )
}

/**
 * The pin from the logo, redrawn as SVG for small sizes and the favicon. Keep in sync with
 * public/favicon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-15 0 260 260" aria-hidden="true" className={cn('shrink-0', className)}>
      <path d="M128 248C110 215 48 160 48 95a87 87 0 1 1 174 0c0 55-52 100-94 153Z" fill="#e8766f" />
      <circle cx="133" cy="92" r="52" fill="#0a4433" />
      <path d="M10 88C5 150 60 180 97 212 105 160 80 110 10 88Z" fill="#fcc9b5" opacity="0.92" />
      <path d="M177 93C130 110 95 190 125 255 130 190 180 150 177 93Z" fill="#5e8167" opacity="0.92" />
    </svg>
  )
}

/** The logo artwork, or just the pin when compact. The accessible name comes from VITE_APP_NAME. */
export function Logo({ to = '/', compact, inverted, onDark, subtitle, size = 'default', className }: LogoProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      {compact ? <LogoMark className={size === 'lg' ? 'size-10' : 'size-8'} /> : null}
      <span className={cn('flex flex-col items-start leading-none', compact && 'sr-only')}>
        <LogoArtwork onDark={inverted || onDark} className={size === 'lg' ? 'h-14' : 'h-9'} />
        <span className="sr-only">{env.appName}</span>
        {subtitle ? <span className="mt-1 type-micro font-medium opacity-70">{subtitle}</span> : null}
      </span>
    </Link>
  )
}
