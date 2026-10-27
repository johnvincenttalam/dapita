import { Fragment } from 'react'
import { Link, useMatches } from 'react-router'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { RouteHandle } from '@/types/router'

export interface BreadcrumbEntry {
  label: string
  to?: string
}

interface BreadcrumbsProps {
  /** Explicit trail. When omitted, the trail is built from the matched routes' `handle.crumb`. */
  items?: BreadcrumbEntry[]
  /** Render nothing for shorter trails, e.g. 2 to hide a lone "Home" on top-level pages. */
  minItems?: number
  /** Replaces route crumbs by path with loaded names, e.g. `{ '/shops/the-good-cut': 'The Good Cut' }`. */
  labels?: Record<string, string | undefined>
  className?: string
}

function useRouteCrumbs(): BreadcrumbEntry[] {
  const matches = useMatches()
  return matches.flatMap((match) => {
    const crumb = (match.handle as RouteHandle | undefined)?.crumb
    return crumb ? [{ label: crumb, to: match.pathname }] : []
  })
}

export function Breadcrumbs({ items, minItems = 1, labels, className }: BreadcrumbsProps) {
  const routeCrumbs = useRouteCrumbs()
  const trail = (items ?? routeCrumbs).map((item) => ({
    ...item,
    label: (item.to && labels?.[item.to]) || item.label,
  }))
  if (trail.length < minItems) return null

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              <BreadcrumbItem>
                {isLast || !item.to ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
