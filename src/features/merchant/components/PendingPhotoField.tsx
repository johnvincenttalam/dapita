import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { Button } from '@/components/ui/button'
import { FilePicker } from '@/features/merchant/components/FilePicker'
import { photoFileProblem } from '@/lib/photos'

/** A photo for a service that doesn't exist yet. It is held here and uploaded once the service is saved. */
export function PendingPhotoField({
  file,
  onChange,
  icon,
}: {
  file?: File
  onChange: (file: File | undefined) => void
  icon: LucideIcon
}) {
  const [problem, setProblem] = useState<string>()
  const [preview, setPreview] = useState<string>()

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the object URL is a browser resource that must be revoked, so it is made and released here
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const onFiles = ([picked]: File[]) => {
    if (!picked) return
    const rejected = photoFileProblem(picked)
    setProblem(rejected)
    if (!rejected) onChange(picked)
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-40 overflow-hidden rounded-2xl bg-muted">
        <ImageWithFallback
          src={file ? preview : undefined}
          sizes="160px"
          alt="Photo to upload"
          icon={icon}
          className="size-full"
        />
      </div>
      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <FilePicker label={file ? 'Replace photo' : 'Add photo'} onFiles={onFiles} />
        {file ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(undefined)}>
            Remove photo
          </Button>
        ) : null}
      </div>
    </div>
  )
}
