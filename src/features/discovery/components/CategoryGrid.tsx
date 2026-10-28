import { LayoutGridIcon, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { categoryIcons } from '@/config/category-icons'
import { cn } from '@/lib/utils'
import type { ServiceCategory } from '@/types/catalog'

interface CategoryTileProps {
  to: string
  label: string
  icon: LucideIcon
  comingSoon?: boolean
}

function CategoryTile({ to, label, icon: Icon, comingSoon }: CategoryTileProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-center gap-2 rounded-xl p-1 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="relative flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-xs ring-1 ring-border transition-colors group-hover:bg-primary group-hover:text-primary-foreground md:size-16 dark:bg-card">
        <Icon aria-hidden="true" className="size-6 md:size-7" strokeWidth={1.75} />
        {comingSoon ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-2 rounded-full bg-card px-1.5 py-0.5 type-micro font-semibold text-muted-foreground shadow-sm ring-1 ring-border"
          >
            Soon
          </span>
        ) : null}
      </span>
      <span className="text-xs leading-tight font-medium text-balance text-foreground">
        {label}
        {comingSoon ? (
          <>
            {' '}
            <span className="sr-only">(coming soon)</span>
          </>
        ) : null}
      </span>
    </Link>
  )
}

const gridClass = 'grid grid-cols-5 gap-x-1 gap-y-4 sm:gap-x-3 md:grid-cols-10'

/** Category shortcuts from design screen 3: nine categories and "More" in two rows of five on phones. */
export function CategoryGrid({ categories, className }: { categories: ServiceCategory[]; className?: string }) {
  const topLevel = categories.filter((category) => !category.parentId).slice(0, 9)

  return (
    <ul className={cn(gridClass, className)}>
      {topLevel.map((category) => (
        <li key={category.id}>
          <CategoryTile
            to={`/categories/${category.slug}`}
            label={category.name}
            icon={categoryIcons[category.icon]}
            comingSoon={category.status === 'coming_soon'}
          />
        </li>
      ))}
      <li>
        <CategoryTile to="/explore" label="More" icon={LayoutGridIcon} />
      </li>
    </ul>
  )
}

export function CategoryGridSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn(gridClass, className)}>
      {Array.from({ length: 10 }, (_, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <Skeleton className="size-14 rounded-full md:size-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}
