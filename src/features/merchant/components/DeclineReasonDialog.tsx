import { useId, useState } from 'react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { bookingRules } from '@/config/booking'

interface DeclineReasonDialogProps {
  customerName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rejects to keep the dialog open (the error is already shown as a toast). */
  onSubmit: (reason: string | undefined) => Promise<void>
}

/** Decline a request with an optional reason the customer will see (BKG-02, BKG-08). */
export function DeclineReasonDialog({ customerName, open, onOpenChange, onSubmit }: DeclineReasonDialogProps) {
  const id = useId()
  const [reason, setReason] = useState('')

  // Start empty each time it opens again.
  const handleOpenChange = (next: boolean) => {
    if (!next) setReason('')
    onOpenChange(next)
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      destructive
      title="Decline this request?"
      description={
        <span className="block space-y-3 text-left">
          <span className="block">{customerName} will see that you declined, plus your reason if you give one.</span>
          <span className="block space-y-1.5">
            <Label htmlFor={id} className="text-foreground">
              Reason (optional)
            </Label>
            <Textarea
              id={id}
              rows={3}
              maxLength={bookingRules.reasonMaxLength}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-describedby={`${id}-count`}
            />
            <span id={`${id}-count`} className="block text-right text-xs text-muted-foreground tabular-nums">
              {reason.length}/{bookingRules.reasonMaxLength}
            </span>
          </span>
        </span>
      }
      confirmLabel="Decline request"
      cancelLabel="Keep request"
      onConfirm={() => onSubmit(reason.trim() || undefined)}
    />
  )
}
