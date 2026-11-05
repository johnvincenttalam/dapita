import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon, XIcon } from 'lucide-react'
import { useEffect, useId, useRef, useState, type DragEvent } from 'react'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { Panel } from '@/components/shared/Panel'
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
import { photoMessages, photoRules } from '@/config/photos'
import {
  useAddGalleryPhotoMutation,
  useRemovePhotoMutation,
  useReorderGalleryMutation,
  useSetCoverPhotoMutation,
} from '@/features/merchant/api/business-queries'
import { FilePicker, UploadingOverlay } from '@/features/merchant/components/FilePicker'
import { getErrorMessage } from '@/lib/api-client'
import { hasCover, photoFileProblem } from '@/lib/photos'
import type { Business, BusinessPhoto } from '@/types/business'

/** A file waiting to upload, uploading, or turned away. */
interface QueuedFile {
  key: number
  file: File
  state: 'queued' | 'uploading' | 'failed'
  message?: string
}

function CoverPanel({ business }: { business: Business }) {
  const setCover = useSetCoverPhotoMutation(business.id)
  const [problem, setProblem] = useState<string>()
  const cover = business.photos.find((photo) => photo.kind === 'cover')
  const needed = business.status === 'draft' || business.status === 'changes_requested'

  const onFiles = ([file]: File[]) => {
    const rejected = file ? photoFileProblem(file) : undefined
    setProblem(rejected)
    if (!file || rejected) return
    setCover.mutate(file, { onError: (error) => setProblem(getErrorMessage(error)) })
  }

  return (
    <Panel title="Cover photo">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
        {cover ? (
          <ImageWithFallback
            src={cover.url}
            srcSet={cover.srcSet}
            sizes="(min-width: 672px) 576px, 100vw"
            alt={cover.alt}
            className="size-full"
          />
        ) : (
          <p className="flex size-full items-center justify-center p-6 text-center text-sm text-pretty text-muted-foreground">
            Add a cover photo. It’s the first thing customers see.
            {needed ? ' You need one to submit your listing.' : ''}
          </p>
        )}
        {setCover.isPending ? <UploadingOverlay /> : null}
      </div>
      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      ) : null}
      <FilePicker
        label={cover ? 'Replace cover photo' : 'Add a cover photo'}
        disabled={setCover.isPending}
        onFiles={onFiles}
      />
    </Panel>
  )
}

type MoveButton = 'earlier' | 'later' | 'remove'

/** Says how many files didn’t fit, after the gallery-full message. */
const overflowNote = (dropped: number) =>
  photoMessages.galleryFull.replace(/\.$/, `, so ${dropped} ${dropped === 1 ? 'wasn’t' : 'weren’t'} added.`)

/** `onBusyChange` hears whether any upload is waiting or in flight. */
function GalleryPanel({ business, onBusyChange }: { business: Business; onBusyChange?: (busy: boolean) => void }) {
  const add = useAddGalleryPhotoMutation(business.id)
  const reorder = useReorderGalleryMutation(business.id)
  const remove = useRemovePhotoMutation(business.id)
  const gallery = business.photos.filter((photo) => photo.kind === 'gallery')
  const [uploads, setUploads] = useState<QueuedFile[]>([])
  const [note, setNote] = useState<string>()
  const [removing, setRemoving] = useState<BusinessPhoto>()
  const uploadsRef = useRef<QueuedFile[]>([])
  const running = useRef(false)
  const nextKey = useRef(0)
  const dragged = useRef<number>(undefined)
  const unmounted = useRef(false)
  // Each photo's controls, so focus can follow a photo moved with the keyboard.
  const buttons = useRef(new Map<string, Partial<Record<MoveButton, HTMLButtonElement | null>>>())
  const [moved, setMoved] = useState<{ id: string; position: number }>()
  const refocus = useRef<string>(undefined)
  const order = gallery.map((photo) => photo.id).join(' ')
  const busy = uploads.some((item) => item.state !== 'failed')

  // Leaving the tab stops the queue after the file in flight, so nothing uploads unseen.
  useEffect(() => {
    unmounted.current = false
    return () => {
      unmounted.current = true
    }
  }, [])

  useEffect(() => {
    onBusyChange?.(busy)
  }, [busy, onBusyChange])

  // Moving a photo can unmount the button that was pressed, so focus goes to the
  // same photo's nearest control once the new order is on screen.
  useEffect(() => {
    if (!moved || refocus.current !== moved.id || order.split(' ')[moved.position - 1] !== moved.id) return
    refocus.current = undefined
    const controls = buttons.current.get(moved.id)
    ;(controls?.earlier ?? controls?.later ?? controls?.remove)?.focus()
  }, [moved, order])

  const buttonRef = (id: string, button: MoveButton) => (element: HTMLButtonElement | null) => {
    buttons.current.set(id, { ...buttons.current.get(id), [button]: element })
  }

  const commit = (next: QueuedFile[]) => {
    uploadsRef.current = next
    setUploads(next)
  }
  /** Change one queued file, or drop it when `change` is null. */
  const patch = (key: number, change: Partial<QueuedFile> | null) =>
    commit(uploadsRef.current.flatMap((item) => (item.key !== key ? [item] : change ? [{ ...item, ...change }] : [])))

  /** One at a time, so each response is the newest state of the business. */
  const drain = async () => {
    if (running.current) return
    running.current = true
    try {
      let item = uploadsRef.current.find((u) => u.state === 'queued')
      while (item && !unmounted.current) {
        patch(item.key, { state: 'uploading' })
        try {
          await add.mutateAsync(item.file)
          patch(item.key, null)
        } catch (error) {
          patch(item.key, { state: 'failed', message: getErrorMessage(error) })
        }
        item = uploadsRef.current.find((u) => u.state === 'queued')
      }
    } finally {
      running.current = false
    }
  }

  const onFiles = (files: File[]) => {
    // Files turned away on the spot never take a slot; failed uploads may be retried, so they do.
    const waiting = uploadsRef.current.filter((u) => !photoFileProblem(u.file)).length
    let free = Math.max(0, photoRules.maxGalleryPhotos - gallery.length - waiting)
    let dropped = 0
    const added: QueuedFile[] = []
    for (const file of files) {
      const message = photoFileProblem(file)
      if (message) added.push({ key: nextKey.current++, file, state: 'failed', message })
      else if (free > 0) {
        free -= 1
        added.push({ key: nextKey.current++, file, state: 'queued' })
      } else dropped += 1
    }
    setNote(dropped > 0 ? overflowNote(dropped) : undefined)
    commit([...uploadsRef.current, ...added])
    void drain()
  }

  const retry = (key: number) => {
    patch(key, { state: 'queued', message: undefined })
    void drain()
  }

  const move = (from: number, to: number, { followFocus = false } = {}) => {
    if (reorder.isPending || from === to || to < 0 || to >= gallery.length) return
    const ids = gallery.map((photo) => photo.id)
    const [id] = ids.splice(from, 1)
    ids.splice(to, 0, id!)
    setMoved(undefined)
    refocus.current = followFocus ? id : undefined
    reorder.mutate(ids, { onSuccess: () => setMoved({ id: id!, position: to + 1 }) })
  }

  const onDrop = (event: DragEvent, to: number) => {
    event.preventDefault()
    if (dragged.current !== undefined) move(dragged.current, to)
    dragged.current = undefined
  }

  return (
    <Panel
      title="Gallery"
      description={`Up to ${photoRules.maxGalleryPhotos} photos of your space, your work and your team. The first ${photoRules.shownOnShopPage} show on your shop page.`}
    >
      {gallery.length > 0 ? (
        <ul aria-label="Gallery photos" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((photo, index) => (
            <li
              key={photo.id}
              draggable
              onDragStart={() => {
                dragged.current = index
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, index)}
              className="space-y-2"
            >
              <div className="aspect-square overflow-hidden rounded-2xl">
                <ImageWithFallback
                  src={photo.url}
                  srcSet={photo.srcSet}
                  sizes="(min-width: 672px) 180px, 45vw"
                  alt={photo.alt}
                  className="size-full"
                />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="flex gap-1">
                  {index > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Move photo ${index + 1} earlier`}
                      aria-disabled={reorder.isPending || undefined}
                      ref={buttonRef(photo.id, 'earlier')}
                      onClick={() => move(index, index - 1, { followFocus: true })}
                      className="aria-disabled:opacity-50"
                    >
                      <ArrowLeftIcon aria-hidden="true" />
                    </Button>
                  ) : null}
                  {index < gallery.length - 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`Move photo ${index + 1} later`}
                      aria-disabled={reorder.isPending || undefined}
                      ref={buttonRef(photo.id, 'later')}
                      onClick={() => move(index, index + 1, { followFocus: true })}
                      className="aria-disabled:opacity-50"
                    >
                      <ArrowRightIcon aria-hidden="true" />
                    </Button>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove photo ${index + 1}`}
                  ref={buttonRef(photo.id, 'remove')}
                  onClick={() => setRemoving(photo)}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : uploads.length === 0 ? (
        <p className="rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground">No gallery photos yet.</p>
      ) : null}

      {uploads.length > 0 ? (
        <ul aria-label="Uploads" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {uploads.map((item) => (
            <li
              key={item.key}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-3 text-center text-sm"
            >
              {item.state === 'failed' ? (
                <>
                  <p role="alert" className="text-destructive">
                    {item.message}
                  </p>
                  <span className="flex gap-1">
                    {photoFileProblem(item.file) ? null : (
                      <Button type="button" size="sm" shape="pill" onClick={() => retry(item.key)}>
                        Try again
                      </Button>
                    )}
                    <Button type="button" size="sm" shape="pill" variant="ghost" onClick={() => patch(item.key, null)}>
                      Dismiss
                    </Button>
                  </span>
                </>
              ) : (
                <>
                  <Loader2Icon aria-hidden="true" className="size-5 animate-spin" />
                  {item.state === 'uploading' ? 'Uploading…' : 'Waiting…'}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <p role="status" className="sr-only">
        {moved ? `Photo moved to position ${moved.position}.` : null}
      </p>
      {note ? (
        <p role="status" className="text-sm text-muted-foreground">
          {note}
        </p>
      ) : null}
      {gallery.length < photoRules.maxGalleryPhotos ? (
        <FilePicker label="Add photos" multiple onFiles={onFiles} />
      ) : null}

      <AlertDialog open={removing !== undefined} onOpenChange={(open) => !open && setRemoving(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this photo?</AlertDialogTitle>
            <AlertDialogDescription>It comes off your shop page straight away.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && remove.mutate(removing.id)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}

/** The owner's cover and gallery photos (MER-01). The setup wizard reuses it with `onContinue`. */
export function PhotosPanel({ business, onContinue }: { business: Business; onContinue?: () => void }) {
  const [uploading, setUploading] = useState(false)
  const waitId = useId()
  return (
    <div className="space-y-6">
      <CoverPanel business={business} />
      <GalleryPanel business={business} onBusyChange={setUploading} />
      {onContinue ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {uploading ? (
            <p id={waitId} className="text-sm text-muted-foreground">
              Wait for your photos to finish uploading.
            </p>
          ) : null}
          <Button
            type="button"
            shape="pill"
            disabled={!hasCover(business) || uploading}
            aria-describedby={uploading ? waitId : undefined}
            onClick={onContinue}
            className="w-full sm:w-auto"
          >
            Continue
          </Button>
        </div>
      ) : null}
    </div>
  )
}
