import type { BrandPhotoSource } from '@/config/brand-photos'
import { cn } from '@/lib/utils'

interface BrandPhotoProps {
  photo: BrandPhotoSource
  /** The `sizes` attribute: how wide the photo is shown, so the browser picks the smaller file when it can. */
  sizes: string
  /** The page's largest element (a hero): the browser fetches it before other images. */
  priority?: boolean
  className?: string
}

/** A decorative brand photo (from `config/brand-photos`) that fills its box; position it with `object-[x_y]`. */
export function BrandPhoto({ photo, sizes, priority = false, className }: BrandPhotoProps) {
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt=""
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      className={cn('object-cover', className)}
    />
  )
}
