import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

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
import { PhotoTile } from '@/features/merchant/components/PhotoTile'
import { getErrorMessage } from '@/lib/api-client'
import { photoFileProblem } from '@/lib/photos'
import type { Service } from '@/types/business'

/** A service's photo. It changes on the spot, apart from the form's Save. */
export function ServicePhotoField({
  businessId,
  service,
  icon,
  initialProblem,
}: {
  businessId: string
  service: Service
  icon: LucideIcon
  /** A problem from a failed upload on the page before, shown until the next pick. */
  initialProblem?: string
}) {
  const setPhoto = useSetServicePhotoMutation(businessId)
  const removePhoto = useRemoveServicePhotoMutation(businessId)
  const [problem, setProblem] = useState(initialProblem)
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
    <PhotoTile
      src={service.photo?.url}
      srcSet={service.photo?.srcSet}
      alt={service.name}
      icon={icon}
      hasPhoto={Boolean(service.photo)}
      busy={setPhoto.isPending}
      disabled={busy}
      problem={problem}
      onFiles={onFiles}
    >
      {service.photo ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          disabled={busy}
          onClick={() => setConfirming(true)}
        >
          Remove photo
        </Button>
      ) : null}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
            <AlertDialogDescription>It comes off your shop page straight away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setProblem(undefined)
                removePhoto.mutate(service.id)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PhotoTile>
  )
}
