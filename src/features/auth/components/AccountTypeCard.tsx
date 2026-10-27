import { ChevronRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import { BrandPhoto } from '@/components/shared/BrandPhoto'
import type { BrandPhotoSource } from '@/config/brand-photos'

interface AccountTypeCardProps {
  to: string
  title: string
  description: string
  photo: BrandPhotoSource
}

/**
 * One choice on "How will you use Dapita?" (design screen 2): a photo above a
 * title, description and chevron.
 */
export function AccountTypeCard({ to, title, description, photo }: AccountTypeCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-3xl card-surface outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="block aspect-16/9 overflow-hidden bg-primary/10">
        <BrandPhoto
          photo={photo}
          sizes="(min-width: 768px) 23rem, min(28rem, 100vw)"
          className="size-full transition-transform duration-300 group-hover:scale-105"
        />
      </span>
      <span className="flex items-center gap-4 p-5">
        <span className="min-w-0 flex-1 space-y-1">
          <h2 className="type-subheading">{title}</h2>
          <span className="block text-sm text-pretty text-muted-foreground">{description}</span>
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </span>
      </span>
    </Link>
  )
}
