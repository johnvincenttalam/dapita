import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { PhotoTile } from '@/features/merchant/components/PhotoTile'
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
    <PhotoTile
      src={file ? preview : undefined}
      alt="Photo to upload"
      icon={icon}
      hasPhoto={Boolean(file)}
      problem={problem}
      onFiles={onFiles}
    >
      {file ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => {
            setProblem(undefined)
            onChange(undefined)
          }}
        >
          Remove photo
        </Button>
      ) : null}
    </PhotoTile>
  )
}
