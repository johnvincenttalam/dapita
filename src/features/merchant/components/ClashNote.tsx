import { TriangleAlertIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A double-booking warning. Neutral on purpose: status colours mean state
 * (DESIGN.md), and a clash is advice, not a state. The owner may still go ahead.
 */
export function ClashNote({ text, className }: { text: string | undefined; className?: string }) {
  if (!text) return null
  return (
    <div className={cn('flex gap-3 rounded-2xl bg-muted px-4 py-3', className)}>
      <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-foreground" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-pretty text-foreground">{text}</p>
        <p className="text-xs text-muted-foreground">Only bookings made on Dapita are checked.</p>
      </div>
    </div>
  )
}
