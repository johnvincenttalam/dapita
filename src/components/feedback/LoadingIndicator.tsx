import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface LoadingIndicatorProps {
  /** Visible text and accessible name. */
  label?: string
  /** "inline" sits in a row; "block" centres itself in the available space. */
  layout?: 'inline' | 'block'
  className?: string
}

export function LoadingIndicator({ label = 'Loading…', layout = 'block', className }: LoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        layout === 'block' && 'min-h-40 justify-center py-10',
        className,
      )}
    >
      <Spinner aria-hidden="true" role="presentation" />
      <span>{label}</span>
    </div>
  )
}
