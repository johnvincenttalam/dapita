import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PanelProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}

/** A titled card section on marketplace pages (booking detail, account). Its heading names the region. */
export function Panel({ title, description, children, className }: PanelProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('space-y-4 rounded-3xl card-surface p-5 md:p-6', className)}>
      <div className="space-y-1">
        <h2 id={id} className="type-heading">
          {title}
        </h2>
        {description ? <p className="text-sm text-pretty text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
