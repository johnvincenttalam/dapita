import { ImagePlusIcon, type LucideIcon } from 'lucide-react'
import { useId, type ChangeEvent, type ReactNode } from 'react'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { photoRules } from '@/config/photos'
import { UploadingOverlay } from '@/features/merchant/components/FilePicker'

const accept = photoRules.acceptedTypes.join(',')

/** A compact photo spot: the tile is the picker, with its text and any extra controls beside it. */
export function PhotoTile({
  src,
  srcSet,
  alt,
  icon,
  hasPhoto,
  busy,
  disabled,
  problem,
  onFiles,
  children,
}: {
  src?: string
  srcSet?: string
  alt: string
  icon: LucideIcon
  /** Drives the caption: Add photo vs Replace photo. */
  hasPhoto: boolean
  /** Upload in flight: overlay shown, input disabled. */
  busy?: boolean
  disabled?: boolean
  problem?: string
  onFiles: (files: File[]) => void
  /** Extra controls in the text column (the Remove button and its dialog). */
  children?: ReactNode
}) {
  const id = useId()
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) onFiles(files)
  }

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={busy || disabled}
          onChange={handleChange}
          className="peer sr-only"
        />
        <label
          htmlFor={id}
          className="relative block size-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-muted transition-shadow peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:ring-2 hover:ring-ring/40"
        >
          <span aria-hidden="true">
            <ImageWithFallback src={src} srcSet={srcSet} sizes="96px" alt={alt} icon={icon} className="size-full" />
          </span>
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-background/80 px-1 py-1 text-center text-xs font-medium backdrop-blur-sm">
            <ImagePlusIcon aria-hidden="true" className="size-3" />
            {hasPhoto ? 'Replace photo' : 'Add photo'}
          </span>
          {busy ? <UploadingOverlay /> : null}
        </label>
      </div>
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-medium">Photo</p>
        <p className="text-muted-foreground">Shown on your shop page and when customers book.</p>
        {problem ? (
          <p role="alert" className="text-destructive">
            {problem}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  )
}
