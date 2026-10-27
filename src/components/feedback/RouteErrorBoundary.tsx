import { HomeIcon } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/button'

function useRouteErrorText() {
  const error = useRouteError()
  const title = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'This page failed to load'
  const description = isRouteErrorResponse(error)
    ? typeof error.data === 'string'
      ? error.data
      : 'The request could not be completed.'
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'
  return { title, description }
}

function RouteError({ className }: { className?: string }) {
  const { title, description } = useRouteErrorText()
  return (
    <ErrorState
      className={className}
      title={title}
      description={description}
      onRetry={() => window.location.reload()}
      action={
        <Button asChild variant="ghost">
          <Link to="/">
            <HomeIcon aria-hidden="true" />
            Go home
          </Link>
        </Button>
      }
    />
  )
}

/** Last-resort boundary at the root: replaces the whole screen. */
export function RouteErrorBoundary() {
  return (
    <main id="main-content" className="flex min-h-svh items-center justify-center p-4">
      <RouteError className="max-w-lg" />
    </main>
  )
}

/** Page-level boundary inside a layout: the shell and its navigation stay usable. */
export function InlineRouteErrorBoundary() {
  return (
    <div className="flex justify-center px-4 py-section">
      <RouteError className="max-w-lg" />
    </div>
  )
}
