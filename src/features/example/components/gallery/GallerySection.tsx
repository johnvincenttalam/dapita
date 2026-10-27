import type { ReactNode } from 'react'

import { SectionHeader } from '@/components/shared/SectionHeader'
import { cn } from '@/lib/utils'

interface GallerySectionProps {
  id: string
  title: string
  description?: string
  children: ReactNode
}

/** A top-level gallery section; `id` is the in-page anchor. */
export function GallerySection({ id, title, description, children }: GallerySectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 space-y-6">
      <SectionHeader id={`${id}-heading`} title={title} description={description} />
      {children}
    </section>
  )
}

interface DemoProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** Classes for the specimen area (defaults to a wrapping flex row). */
  contentClassName?: string
}

/** A titled specimen box inside a section. */
export function Demo({ title, description, children, className, contentClassName }: DemoProps) {
  return (
    <div className={cn('min-w-0 rounded-xl border bg-card', className)}>
      <div className="border-b px-4 py-3 sm:px-5">
        <h3 className="type-label">{title}</h3>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className={cn('flex flex-wrap items-center gap-3 p-4 sm:p-5', contentClassName)}>{children}</div>
    </div>
  )
}
