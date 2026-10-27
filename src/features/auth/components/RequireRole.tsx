import { HomeIcon, LogInIcon, ShieldAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingIndicator } from '@/components/feedback/LoadingIndicator'
import { Button } from '@/components/ui/button'
import { useSession, useSignOutMutation } from '@/features/auth/api/queries'
import { hasAnyRole } from '@/lib/roles'
import type { SessionUser, UserRole } from '@/types/auth'

interface RequireRoleProps {
  roles: readonly UserRole[]
  /** Who the area is for, used in the access-denied message ("merchants"). */
  audience: string
  /** `page`: guards a whole layout (full-screen states). `inline`: guards pages inside an existing layout. */
  variant?: 'page' | 'inline'
}

function AccessDenied({ user, audience, next }: { user: SessionUser; audience: string; next: string }) {
  const navigate = useNavigate()
  const signOut = useSignOutMutation()

  return (
    <EmptyState
      icon={ShieldAlertIcon}
      title="You don’t have access to this area"
      pageTitle
      description={`You’re signed in as ${user.name}. This section is for ${audience}.`}
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link to="/">
              <HomeIcon aria-hidden="true" />
              Go to the marketplace
            </Link>
          </Button>
          <Button
            loading={signOut.isPending}
            onClick={() =>
              signOut.mutate(undefined, {
                onSuccess: () => void navigate(`/auth/sign-in?next=${encodeURIComponent(next)}`),
              })
            }
          >
            {!signOut.isPending && <LogInIcon aria-hidden="true" />}
            Use another account
          </Button>
        </div>
      }
    />
  )
}

/**
 * Route guard: renders child routes only for users with one of `roles`, and sends signed-out
 * visitors to sign-in with a `next` link back. This only controls navigation; every API call
 * is authorized by the server (doc §13.1).
 */
export function RequireRole({ roles, audience, variant = 'page' }: RequireRoleProps) {
  const { user, isPending, isError, error, refetch, isRefetching } = useSession()
  const { pathname, search } = useLocation()
  const next = `${pathname}${search}`
  const frame = (children: ReactNode) =>
    variant === 'page' ? (
      <main id="main-content" className="flex min-h-svh items-center justify-center p-4">
        {children}
      </main>
    ) : (
      <div className="flex items-center justify-center px-4 py-section">{children}</div>
    )

  if (isPending) return frame(<LoadingIndicator label="Checking your session…" />)
  if (isError)
    return frame(
      <ErrorState
        className="max-w-lg"
        title="We couldn’t check your session"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isRefetching}
      />,
    )
  if (!user) return <Navigate to={`/auth/sign-in?next=${encodeURIComponent(next)}`} replace />
  if (!hasAnyRole(user, roles)) return frame(<AccessDenied user={user} audience={audience} next={next} />)
  return <Outlet />
}
