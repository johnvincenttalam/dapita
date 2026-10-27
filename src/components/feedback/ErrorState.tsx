import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export interface ErrorStateProps {
  title?: string
  /** Either a message or the thrown error; errors are converted to a readable message. */
  error?: unknown
  description?: ReactNode
  /** Renders a "Try again" button. */
  onRetry?: () => void
  isRetrying?: boolean
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  description,
  onRetry,
  isRetrying,
  action,
  className,
}: ErrorStateProps) {
  return (
    <Empty role="alert" className={cn('border border-dashed border-destructive/30 bg-destructive/5', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <TriangleAlertIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description ?? (error !== undefined ? getErrorMessage(error) : null)}</EmptyDescription>
      </EmptyHeader>
      {onRetry || action ? (
        <EmptyContent className="flex-row justify-center">
          {onRetry ? (
            <Button variant="outline" onClick={onRetry} loading={isRetrying}>
              {!isRetrying && <RefreshCwIcon aria-hidden="true" />}
              Try again
            </Button>
          ) : null}
          {action}
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
