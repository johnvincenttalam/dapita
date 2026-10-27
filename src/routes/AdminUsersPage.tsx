import { UsersIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAccountActionMutation, useAdminUsersQuery } from '@/features/admin/api/queries'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getErrorMessage } from '@/lib/api-client'
import { formatDate } from '@/lib/format'
import { roleLabels } from '@/lib/roles'
import type { AdminUser } from '@/types/admin'

type Pending = { user: AdminUser; action: 'suspend' | 'reinstate' } | null

function AccountActionDialog({ pending, onClose }: { pending: Pending; onClose: () => void }) {
  const id = useId()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const act = useAccountActionMutation()
  if (!pending) return null
  const { user, action } = pending
  const suspend = action === 'suspend'

  const submit = async () => {
    setError(undefined)
    try {
      await act.mutateAsync({ id: user.id, action, reason })
      toast.success(suspend ? `${user.name} is suspended and signed out.` : `${user.name} can sign in again.`)
      onClose()
    } catch (caught) {
      setError(getErrorMessage(caught))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !act.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {suspend ? 'Suspend' : 'Reinstate'} {user.name}?
          </DialogTitle>
          <DialogDescription>
            {suspend
              ? 'They’re signed out at once and can’t sign in. Their bookings and messages stay as they are. The reason goes in the account’s history.'
              : 'They can sign in again. The reason goes in the account’s history.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor={id} className="type-label">
            Reason
          </label>
          <Textarea
            id={id}
            rows={3}
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
          <Button variant="outline" shape="pill" onClick={onClose} disabled={act.isPending}>
            Cancel
          </Button>
          <Button
            variant={suspend ? 'destructive' : 'default'}
            shape="pill"
            loading={act.isPending}
            onClick={() => void submit()}
          >
            {suspend ? 'Suspend' : 'Reinstate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Users: look up accounts and suspend or reinstate them, always with a reason. */
export default function AdminUsersPage() {
  useDocumentTitle('Users')
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const debounced = useDebouncedValue(query.trim(), 250)
  const users = useAdminUsersQuery(debounced)
  const [pending, setPending] = useState<Pending>(null)

  const onQuery = (value: string) => {
    setQuery(value)
    setSearchParams(value.trim() ? { q: value.trim() } : {}, { replace: true })
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Users" description="Look up accounts by name or email." />
      <SearchInput value={query} onValueChange={onQuery} label="Search accounts" placeholder="Name or email" />

      {users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} isRetrying={users.isRefetching} />
      ) : !users.data ? (
        <Skeleton aria-hidden="true" className="h-60 rounded-3xl" />
      ) : users.data.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No accounts match"
          description="Try part of a name or an email address."
          bordered
        />
      ) : (
        <ul aria-label="Accounts" className="divide-y divide-border/70 overflow-hidden rounded-3xl card-surface">
          {users.data.map((user) => {
            const isAdmin = user.roles.includes('admin')
            return (
              <li key={user.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{user.name}</span>
                    {user.suspended ? (
                      <Badge variant="destructive" className="rounded-full">
                        Suspended
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-sm break-all text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.roles.map((role) => roleLabels[role]).join(', ')}
                    {user.businessNames.length ? ` · ${user.businessNames.join(', ')}` : ''} · Joined{' '}
                    {formatDate(user.createdAt)}
                  </p>
                  {user.suspended && user.suspendedReason ? (
                    <p className="text-sm">Suspended: “{user.suspendedReason}”</p>
                  ) : null}
                </div>
                {isAdmin ? null : (
                  <Button
                    variant={user.suspended ? 'outline' : 'ghost'}
                    shape="pill"
                    size="sm"
                    className={
                      user.suspended ? undefined : 'self-start text-destructive hover:text-destructive sm:self-auto'
                    }
                    aria-label={`${user.suspended ? 'Reinstate' : 'Suspend'} ${user.name}`}
                    onClick={() => setPending({ user, action: user.suspended ? 'reinstate' : 'suspend' })}
                  >
                    {user.suspended ? 'Reinstate' : 'Suspend'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <AccountActionDialog
        key={pending ? `${pending.user.id}-${pending.action}` : 'none'}
        pending={pending}
        onClose={() => setPending(null)}
      />
    </div>
  )
}
