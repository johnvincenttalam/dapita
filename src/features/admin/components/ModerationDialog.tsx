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
import { useModerateMerchantMutation } from '@/features/admin/api/queries'
import { getErrorMessage } from '@/lib/api-client'
import { moderationLabels } from '@/lib/moderation'
import { moderationSchema } from '@/schemas/moderation'
import type { ModerationActionType } from '@/types/admin'

const copy: Record<
  ModerationActionType,
  { title: (name: string) => string; description: string; done: (name: string) => string }
> = {
  approve: {
    title: (name) => `Approve ${name}?`,
    description: 'The listing goes live: customers can find it and send requests. Note what you checked.',
    done: (name) => `${name} is live.`,
  },
  request_changes: {
    title: (name) => `Request changes to ${name}?`,
    description: 'The owner sees this reason and can resubmit once it’s fixed. Be specific.',
    done: (name) => `Sent back to ${name} with your note.`,
  },
  reject: {
    title: (name) => `Reject ${name}?`,
    description: 'The listing won’t go live and can’t be resubmitted. The owner sees this reason.',
    done: (name) => `${name} was rejected.`,
  },
  suspend: {
    title: (name) => `Suspend ${name}?`,
    description:
      'The shop disappears from search and its page at once. Existing bookings aren’t cancelled. The owner sees this reason.',
    done: (name) => `${name} is suspended and hidden from customers.`,
  },
  reinstate: {
    title: (name) => `Reinstate ${name}?`,
    description: 'The listing goes live again. Note why the suspension ended.',
    done: (name) => `${name} is live again.`,
  },
}

interface ModerationDialogProps {
  businessId: string
  businessName: string
  action: ModerationActionType | null
  onClose: () => void
}

/** Every decision needs a reason; it goes in the history and, unless approving, to the owner (ADM-01). */
export function ModerationDialog({ businessId, businessName, action, onClose }: ModerationDialogProps) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const moderate = useModerateMerchantMutation(businessId)

  const close = () => {
    if (moderate.isPending) return
    setReason('')
    setError(undefined)
    onClose()
  }

  const submit = async () => {
    if (!action) return
    const valid = moderationSchema.safeParse({ action, reason })
    if (!valid.success) {
      setError(valid.error.issues[0]?.message)
      return
    }
    try {
      await moderate.mutateAsync(valid.data)
      toast.success(copy[action].done(businessName))
      close()
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  const destructive = action === 'reject' || action === 'suspend'

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && close()}>
      {action ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy[action].title(businessName)}</DialogTitle>
            <DialogDescription>{copy[action].description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor={id} className="type-label">
              Reason
            </label>
            <Textarea
              id={id}
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            {error ? (
              <p id={`${id}-error`} className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" shape="pill" onClick={close} disabled={moderate.isPending}>
              Cancel
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              shape="pill"
              loading={moderate.isPending}
              onClick={() => void submit()}
            >
              {moderationLabels[action].verb}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
