import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /** Keep the heading hierarchy correct: h2 under a page title, h3 under an h2. */
  as?: 'h2' | 'h3'
  id?: string
  className?: string
}

export function SectionHeader({ title, description, actions, as: Heading = 'h2', id, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        <Heading id={id} className={Heading === 'h2' ? 'type-heading' : 'type-subheading'}>
          {title}
        </Heading>
        {description ? <p className="text-sm text-pretty text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
