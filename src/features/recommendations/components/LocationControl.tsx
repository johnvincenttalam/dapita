import { MapPinIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useUserLocation } from '@/hooks/use-user-location'
import { cn } from '@/lib/utils'

/** Where suggestions are measured from, with a way to change it. */
export function LocationControl({ className }: { className?: string }) {
  const location = useUserLocation()
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-sm', className)}>
      <MapPinIcon aria-hidden="true" className="size-4 text-primary" />
      <span>
        <span className="text-muted-foreground">Showing shops near </span>
        <span className="font-semibold">{location.area?.name ?? 'you'}</span>
      </span>
      <Button variant="link" size="sm" className="h-auto px-0" aria-label="Change location" onClick={location.clear}>
        Change
      </Button>
    </div>
  )
}
