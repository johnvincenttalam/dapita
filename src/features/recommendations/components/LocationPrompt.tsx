import { LocateFixedIcon, MapPinIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useAreasQuery } from '@/features/discovery/api/queries'
import { useUserLocation } from '@/hooks/use-user-location'
import { cn } from '@/lib/utils'

const locationMessages = {
  denied: 'Location is turned off for this site, so we can’t find you. Choose your area instead.',
  unavailable: 'We couldn’t find your location just now. Try again, or choose your area.',
} as const

/** "Where are you?": the first step of the home page until a location is set. */
export function LocationPrompt({ className }: { className?: string }) {
  const location = useUserLocation()
  const areas = useAreasQuery()
  const [choosingArea, setChoosingArea] = useState(false)

  return (
    <section
      aria-labelledby="location-prompt-heading"
      className={cn('space-y-4 rounded-3xl card-surface p-5 md:p-6', className)}
    >
      <div className="space-y-1">
        <h2 id="location-prompt-heading" className="type-heading">
          Where are you?
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          We’ll show shops near you. Your location stays on this device.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button shape="pill" loading={location.status === 'locating'} onClick={location.locate}>
          <LocateFixedIcon aria-hidden="true" />
          Use my location
        </Button>
        <Button
          shape="pill"
          variant="outline"
          aria-expanded={choosingArea}
          aria-controls="location-prompt-areas"
          onClick={() => setChoosingArea((open) => !open)}
        >
          <MapPinIcon aria-hidden="true" />
          Choose your area
        </Button>
      </div>
      <div aria-live="polite" className="text-sm text-muted-foreground">
        {location.status === 'denied' || location.status === 'unavailable' ? (
          <p>{locationMessages[location.status]}</p>
        ) : null}
      </div>
      {choosingArea ? (
        <ul id="location-prompt-areas" aria-label="Areas" className="flex flex-wrap gap-2">
          {areas.data?.map((area) => (
            <li key={area.id}>
              <Button shape="pill" variant="outline" size="sm" onClick={() => location.chooseArea(area)}>
                {area.name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
