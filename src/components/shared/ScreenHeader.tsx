import { ChevronLeftIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useBackNavigation } from '@/hooks/use-back-navigation'
import { cn } from '@/lib/utils'

interface ScreenHeaderProps {
  /** Rendered as the page's single <h1>. */
  title: ReactNode
  description?: ReactNode
  /**
   * Where "Back" goes when there is no in-app history (e.g. the page was opened
   * from a link). Omit on top-level tab pages, which have no back button.
   */
  backTo?: string
  /** Compact icon actions shown on phones next to the title (design screens 9–10). */
  mobileActions?: ReactNode
  /** Actions shown beside the title from `md` up. */
  actions?: ReactNode
  className?: string
}

/**
 * Title bar for marketplace screens. Phones: back button, centred title and an
 * optional action, as in design screens 6, 9 and 10. From `md` up it becomes a
 * left-aligned page title, with breadcrumbs above it for wayfinding.
 */
export function ScreenHeader({ title, description, backTo, mobileActions, actions, className }: ScreenHeaderProps) {
  const goBack = useBackNavigation(backTo)

  return (
    <header className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2 md:gap-4">
        {backTo ? (
          <Button variant="ghost" size="icon" aria-label="Back" onClick={goBack} className="-ml-2 md:hidden">
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
          </Button>
        ) : null}
        <h1
          className={cn(
            'min-w-0 flex-1 truncate text-lg font-semibold md:text-left md:type-title md:whitespace-normal',
            backTo ? 'text-center' : 'text-left text-2xl',
          )}
        >
          {title}
        </h1>
        {mobileActions ? (
          <div className="-mr-2 flex items-center md:hidden">{mobileActions}</div>
        ) : backTo ? (
          <span aria-hidden="true" className="size-9 md:hidden" />
        ) : null}
        {actions ? <div className="hidden shrink-0 items-center gap-2 md:flex">{actions}</div> : null}
      </div>
      {description ? (
        <p className="hidden max-w-2xl text-pretty text-muted-foreground md:block">{description}</p>
      ) : null}
    </header>
  )
}
