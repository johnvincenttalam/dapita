import { CircleCheckIcon, Trash2Icon } from 'lucide-react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useRequestDeletionMutation } from '@/features/account/api/queries'
import { formatFullDate } from '@/lib/format'
import type { MyProfile } from '@/types/account'

/**
 * Account deletion request (CUS-06). It's a request, not an instant delete: what is removed
 * and what must be kept depends on retention rules that aren't defined yet (doc §11.1).
 */
export function AccountDeletionRequest({ profile }: { profile: MyProfile }) {
  const request = useRequestDeletionMutation()

  if (profile.deletionRequest) {
    return (
      <Alert variant="info" role="status">
        <CircleCheckIcon aria-hidden="true" />
        <AlertTitle>Deletion requested on {formatFullDate(profile.deletionRequest.requestedAt)}</AlertTitle>
        <AlertDescription>
          We’ll contact you at {profile.email} to confirm before anything is deleted. You can keep using your account
          until then.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-pretty text-muted-foreground">
        Send a request to delete your account. We’ll contact you at {profile.email} to confirm before anything is
        deleted.
      </p>
      <ConfirmDialog
        trigger={
          <Button variant="destructive" shape="pill">
            <Trash2Icon aria-hidden="true" />
            Request account deletion
          </Button>
        }
        destructive
        title="Request account deletion?"
        description={`We’ll contact you at ${profile.email} to confirm. Until then, you can keep using your account.`}
        confirmLabel="Send request"
        cancelLabel="Keep my account"
        onConfirm={async () => {
          await request.mutateAsync()
        }}
      />
    </div>
  )
}
