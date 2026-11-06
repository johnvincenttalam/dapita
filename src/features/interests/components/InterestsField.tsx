import { FieldDescription, FieldLegend, FieldSet } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { InterestChips } from '@/features/interests/components/InterestChips'
import { liveInterestCategories, toggleInterest } from '@/lib/interests'
import type { ID } from '@/types/common'

/** "What are you here for?" inside the create-account form. Never holds sign-up up: no catalog, no field. */
export function InterestsField({
  value,
  onChange,
  disabled,
}: {
  value: ID[]
  onChange: (ids: ID[]) => void
  disabled?: boolean
}) {
  const categories = useCategoriesQuery()

  if (categories.isError) return null
  if (categories.isPending) return <Skeleton aria-hidden="true" className="h-11 w-full rounded-full" />

  const live = liveInterestCategories(categories.data)

  return (
    <FieldSet>
      <FieldLegend>What are you here for?</FieldLegend>
      <FieldDescription>Optional. Pick what you book most and we’ll show those shops first.</FieldDescription>
      <InterestChips
        categories={live}
        selected={new Set(value)}
        onToggle={(id) => onChange(toggleInterest(value, id, live))}
        disabled={disabled}
      />
    </FieldSet>
  )
}
