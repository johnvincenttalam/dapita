import { Panel } from '@/components/shared/Panel'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { InterestChips } from '@/features/interests/components/InterestChips'
import { useInterests } from '@/features/interests/use-interests'
import { interestNames, interestsSummary, liveInterestCategories, toggleInterest } from '@/lib/interests'
import type { ID } from '@/types/common'

/** The profile's home for "What are you here for?": the chips always open, saved as they change. */
export function InterestsPanel() {
  const { interests, answered, isPending, isError, setCategoryIds } = useInterests()
  const categories = useCategoriesQuery()

  if (isError || categories.isError) return null
  if (isPending || categories.isPending) return <Skeleton aria-hidden="true" className="h-40 w-full rounded-3xl" />

  const live = liveInterestCategories(categories.data)
  const picked = new Set(interests.categoryIds)
  const names = interestNames(interests.categoryIds, live)
  const toggle = (id: ID) => setCategoryIds(toggleInterest(interests.categoryIds, id, live))

  return (
    <Panel title="What you’re here for" description="We show these shops first on home.">
      <InterestChips categories={live} selected={picked} onToggle={toggle} />
      <p role="status" className="text-sm text-muted-foreground">
        {names.length > 0 || answered ? interestsSummary(names) : null}
      </p>
    </Panel>
  )
}
