import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useRemoveServicePhotoMutation, useSetServicePhotoMutation } from '@/features/merchant/api/service-queries'
import { FilePicker, UploadingOverlay } from '@/features/merchant/components/FilePicker'
import { getErrorMessage } from '@/lib/api-client'
import { photoFileProblem } from '@/lib/photos'
import type { Service } from '@/types/business'

/** A service's photo. It changes on the spot, apart from the form's Save. */
export function ServicePhotoField({
  businessId,
  service,
  icon,
}: {
  businessId: string
  service: Service
  icon: LucideIcon
}) {
  const setPhoto = useSetServicePhotoMutation(businessId)
  const removePhoto = useRemoveServicePhotoMutation(businessId)
  const [problem, setProblem] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const busy = setPhoto.isPending || removePhoto.isPending

  const onFiles = ([file]: File[]) => {
    if (!file) return
    const rejected = photoFileProblem(file)
    setProblem(rejected)
    if (rejected) return
    setPhoto.mutate({ serviceId: service.id, file }, { onError: (error) => setProblem(getErrorMessage(error)) })
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-40 overflow-hidden rounded-2xl bg-muted">
        <ImageWithFallback
          src={service.photo?.url}
          srcSet={service.photo?.srcSet}
          sizes="160px"
          alt={service.name}
          icon={icon}
          className="size-full"
        />
        {setPhoto.isPending ? <UploadingOverlay /> : null}
      </div>
      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <FilePicker label={service.photo ? 'Replace photo' : 'Add photo'} disabled={busy} onFiles={onFiles} />
        {service.photo ? (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirming(true)}>
            Remove photo
          </Button>
        ) : null}
      </div>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
            <AlertDialogDescription>It comes off your shop page straight away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removePhoto.mutate(service.id)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
