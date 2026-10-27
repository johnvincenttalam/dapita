import type { Priority } from '@/config/navigation'

/** Describes a route whose screen is built in a later phase (rendered by PlannedPage). */
export interface PlannedPageMeta {
  title: string
  description: string
  priority: Priority
  /** Screen in the design reference, e.g. "5 · Shop details". Omit when no design exists. */
  design?: string
  /** Requirement IDs from the project documentation, e.g. ["CUS-05"]. */
  refs?: string[]
}

/** Metadata attached to routes through the `handle` field in src/app/routes.tsx. */
export interface RouteHandle {
  /** Label shown in breadcrumbs. Routes without one are skipped. */
  crumb?: string
  planned?: PlannedPageMeta
}
