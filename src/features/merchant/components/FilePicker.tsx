import { ImagePlusIcon, Loader2Icon } from 'lucide-react'
import { useId, type ChangeEvent } from 'react'

import { photoRules } from '@/config/photos'

const accept = photoRules.acceptedTypes.join(',')

const pickerClass =
  'inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50'

/** A visually hidden file input with a visible label that stays reachable by keyboard. */
export function FilePicker({
  label,
  multiple,
  disabled,
  onFiles,
}: {
  label: string
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
}) {
  const id = useId()
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length > 0) onFiles(files)
  }
  return (
    <div>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        className="peer sr-only"
      />
      <label htmlFor={id} className={pickerClass}>
        <ImagePlusIcon aria-hidden="true" className="size-4" />
        {label}
      </label>
    </div>
  )
}

export function UploadingOverlay() {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 text-sm">
      <Loader2Icon aria-hidden="true" className="size-5 animate-spin" />
      Uploading…
    </span>
  )
}
