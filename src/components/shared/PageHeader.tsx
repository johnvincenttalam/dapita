import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Small label above the title, e.g. a section name. */
  eyebrow?: ReactNode
  /** Primary page actions, aligned to the right on wide screens. */
  actions?: ReactNode
  className?: string
}

/** The single <h1> of a page. Every route should render exactly one. */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="type-eyebrow text-primary">{eyebrow}</p> : null}
        <h1 className="type-title text-balance text-foreground">{title}</h1>
        {description ? <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
