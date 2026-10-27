import { useId, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useReportConversationMutation } from '@/features/messaging/api/queries'
import { getErrorMessage } from '@/lib/api-client'
import { reportSchema } from '@/schemas/message'

interface ReportConversationDialogProps {
  conversationId: string
  otherName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Sends the conversation to Dapita support with the reporter's reason (§13.2). Nothing is hidden or blocked. */
export function ReportConversationDialog({
  conversationId,
  otherName,
  open,
  onOpenChange,
}: ReportConversationDialogProps) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const report = useReportConversationMutation(conversationId)

  const close = (next: boolean) => {
    if (report.isPending) return
    if (!next) {
      setReason('')
      setError(undefined)
    }
    onOpenChange(next)
  }

  const submit = async () => {
    const valid = reportSchema.safeParse({ reason })
    if (!valid.success) {
      setError(valid.error.issues[0]?.message)
      return
    }
    try {
      await report.mutateAsync(valid.data.reason)
      toast.success('Thanks. Our team will review this conversation.')
      close(false)
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this conversation?</DialogTitle>
          <DialogDescription>
            Dapita support will read your messages with {otherName} and follow up if needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor={id} className="type-label">
            What happened?
          </label>
          <Textarea
            id={id}
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            placeholder="e.g. They asked me to pay a deposit to a personal account."
          />
          {error ? (
            <p id={`${id}-error`} className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" shape="pill" onClick={() => close(false)} disabled={report.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" shape="pill" loading={report.isPending} onClick={() => void submit()}>
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
