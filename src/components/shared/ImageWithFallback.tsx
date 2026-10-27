import { ImageIcon, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

interface ImageWithFallbackProps {
  src?: string
  /** Describe the image, or pass "" when it is decorative (e.g. a cover next to the shop name). */
  alt: string
  /** Shown on the placeholder when there is no image or it fails to load. */
  icon?: LucideIcon
  className?: string
}

/**
 * Lazy-loaded image that degrades to a soft branded placeholder. Merchant photos
 * are optional and the prototype only has some (plan Q6), so every image slot needs one.
 */
export function ImageWithFallback({ src, alt, icon: Icon = ImageIcon, className }: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string>()

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={cn('bg-muted object-cover', className)}
      />
    )
  }

  return (
    <div
      {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
      className={cn(
        // One flat brand tint: the peach-to-green gradient was rejected (21 Oct 2026).
        'flex items-center justify-center overflow-hidden bg-primary/10 text-primary/45',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-1/3 max-h-16 min-h-5 max-w-16 min-w-5" strokeWidth={1.5} />
    </div>
  )
}
