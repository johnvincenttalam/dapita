import { SparklesIcon } from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SuggestionChipsProps<T> {
  /** What tapping one does, e.g. "Start from a common rule". */
  label: string
  items: readonly T[]
  itemLabel: (item: T) => string
  onPick: (item: T) => void
  className?: string
}

/** One-tap starting points under a field. Picking one fills the field; the owner can still edit it. */
export function SuggestionChips<T>({ label, items, itemLabel, onPick, className }: SuggestionChipsProps<T>) {
  const id = useId()
  if (!items.length) return null
  return (
    <div role="group" aria-labelledby={id} className={cn('space-y-2', className)}>
      <p id={id} className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <SparklesIcon aria-hidden="true" className="size-3.5" />
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Button
            key={itemLabel(item)}
            type="button"
            variant="outline"
            shape="pill"
            className="h-9 px-4"
            onClick={() => onPick(item)}
          >
            {itemLabel(item)}
          </Button>
        ))}
      </div>
    </div>
  )
}
