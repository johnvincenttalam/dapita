import type { BrandPhotoSource } from '@/config/brand-photos'
import { cn } from '@/lib/utils'

interface BrandPhotoProps {
  photo: BrandPhotoSource
  /** The `sizes` attribute: how wide the photo is shown, so the browser picks the smaller file when it can. */
  sizes: string
  className?: string
}

/** A decorative brand photo (from `config/brand-photos`) that fills its box; position it with `object-[x_y]`. */
export function BrandPhoto({ photo, sizes, className }: BrandPhotoProps) {
  return (
    <img
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt=""
      decoding="async"
      className={cn('object-cover', className)}
    />
  )
}
