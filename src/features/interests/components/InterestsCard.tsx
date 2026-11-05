import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/auth/api/queries'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { InterestChips } from '@/features/interests/components/InterestChips'
import { useInterests } from '@/features/interests/use-interests'
import { interestsSummary, liveInterestCategories } from '@/lib/interests'
import { cn } from '@/lib/utils'
import type { ID } from '@/types/common'

/**
 * "What are you here for?" on the customer home. Asked once; after that a quiet line
 * with the picks and a way to change them, or nothing if the visitor picked nothing.
 */
export function InterestsCard({ className }: { className?: string }) {
  const { user } = useSession()
  const { interests, answered, isPending, isError, setCategoryIds, dismiss } = useInterests()
  const categories = useCategoriesQuery()
  // Decided once, from the answer as the page found it, so picking a chip doesn't close the card.
  const [open, setOpen] = useState<boolean>()
  if (open === undefined && !isPending) setOpen(!answered)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  // Change and Done swap the card and the line; focus follows so it isn't lost with the button.
  const moveFocus = useRef(false)
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    ;(open ? headingRef : changeRef).current?.focus()
  }, [open])

  if (open === undefined || isError || categories.isError) return null
  if (!open && interests.categoryIds.length === 0) return null
  if (categories.isPending) {
    return <Skeleton aria-hidden="true" className={cn(open ? 'h-56 rounded-3xl md:h-48' : 'h-5 w-48', className)} />
  }

  const live = liveInterestCategories(categories.data)
  const picked = new Set(interests.categoryIds)
  const summary = interestsSummary(live.filter((category) => picked.has(category.id)).map((category) => category.name))

  const toggle = (id: ID) => {
    const next = new Set(picked)
    if (!next.delete(id)) next.add(id)
    setCategoryIds(live.filter((category) => next.has(category.id)).map((category) => category.id))
  }
  const toggleOpen = (next: boolean) => {
    moveFocus.current = true
    setOpen(next)
  }

  if (!open) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        {summary} ·{' '}
        <Button ref={changeRef} variant="link" size="sm" className="h-auto px-0" onClick={() => toggleOpen(true)}>
          Change
        </Button>
      </p>
    )
  }

  return (
    <section
      aria-labelledby="interests-heading"
      className={cn('space-y-4 rounded-3xl card-surface p-5 md:p-6', className)}
    >
      <div className="space-y-1">
        <h2 ref={headingRef} id="interests-heading" tabIndex={-1} className="type-heading outline-none">
          What are you here for?
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Pick what you book most and we’ll show those shops first.
        </p>
      </div>
      <InterestChips categories={live} selected={picked} onToggle={toggle} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="status" className="min-w-0 flex-1 text-sm text-muted-foreground">
          {answered ? (
            <p>
              {summary}. {user ? 'Change this any time from your profile.' : 'Change this any time from this page.'}
            </p>
          ) : null}
        </div>
        {answered ? (
          <Button variant="outline" shape="pill" onClick={() => toggleOpen(false)}>
            Done
          </Button>
        ) : (
          <Button
            variant="link"
            className="px-0 text-muted-foreground"
            onClick={() => {
              dismiss()
              setOpen(false)
            }}
          >
            Not now
          </Button>
        )}
      </div>
    </section>
  )
}
