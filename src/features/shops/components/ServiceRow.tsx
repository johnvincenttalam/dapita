import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { ImageWithFallback } from '@/components/shared/ImageWithFallback'
import { Button } from '@/components/ui/button'
import { bookingHref, serviceHref } from '@/features/shops/links'
import { formatDuration, formatPrice } from '@/lib/format'
import type { Service } from '@/types/business'

interface ServiceRowProps {
  service: Service
  shopSlug: string
  icon?: LucideIcon
}

/** One service with duration, price and a Book action (design screen 5, "Popular Services"). */
export function ServiceRow({ service, shopSlug, icon }: ServiceRowProps) {
  return (
    <article className="flex items-center gap-3 py-3">
      <ImageWithFallback src={service.photoUrl} alt="" icon={icon} className="size-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-pretty">
          <Link
            to={serviceHref(shopSlug, service.id)}
            className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {service.name}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">{formatDuration(service.durationMinutes)}</p>
        <p className="text-sm font-semibold">{formatPrice(service.price)}</p>
      </div>
      <Button asChild size="sm" shape="pill" className="px-4">
        <Link to={bookingHref(shopSlug, service.id)} aria-label={`Book ${service.name}`}>
          Book
        </Link>
      </Button>
    </article>
  )
}
