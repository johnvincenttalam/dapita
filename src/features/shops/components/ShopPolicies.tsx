import { CalendarCheckIcon, InfoIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { BookingMethod, BusinessPolicies } from '@/types/business'

/**
 * How booking works at this shop. Request mode must say that times are
 * preferences the shop confirms (BKG-05, doc §7.3).
 */
export function BookingMethodNote({ method }: { method: BookingMethod }) {
  return method === 'instant' ? (
    <Alert variant="info">
      <CalendarCheckIcon aria-hidden="true" />
      <AlertTitle>Instant booking</AlertTitle>
      <AlertDescription>Times shown are this shop’s live availability.</AlertDescription>
    </Alert>
  ) : (
    <Alert variant="info">
      <InfoIcon aria-hidden="true" />
      <AlertTitle>Request to book</AlertTitle>
      <AlertDescription>
        Pick a preferred time and the shop confirms it. Your appointment isn’t booked until they do.
      </AlertDescription>
    </Alert>
  )
}

/** Cancellation, no-show and deposit rules, shown before anyone books (BKG-06). */
export function ShopPolicies({ policies }: { policies: BusinessPolicies }) {
  const items = [
    { title: 'Cancellation', text: policies.cancellation },
    { title: 'No-show', text: policies.noShow },
    { title: 'Deposit', text: policies.deposit },
  ].filter((item): item is { title: string; text: string } => Boolean(item.text))

  return (
    <dl className="space-y-3 text-sm">
      {items.map((item) => (
        <div key={item.title}>
          <dt className="font-semibold">{item.title}</dt>
          <dd className="text-pretty text-muted-foreground">{item.text}</dd>
        </div>
      ))}
    </dl>
  )
}
