import { useState, type ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export interface ConfirmDialogProps {
  /** Element that opens the dialog. Omit when controlling `open` yourself. */
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button as destructive. */
  destructive?: boolean
  /** May return a promise; the dialog stays open with a loading button until it settles. */
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  trigger,
  open: openProp,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const open = openProp ?? internalOpen

  const setOpen = (next: boolean) => {
    if (pending) return
    if (openProp === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      if (openProp === undefined) setInternalOpen(false)
      onOpenChange?.(false)
    } catch {
      // Keep the dialog open so the user can retry. Report the error from
      // onConfirm itself (mutations already toast through the query client).
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog can stay open while onConfirm runs. */}
          <Button variant={destructive ? 'destructive' : 'default'} loading={pending} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
