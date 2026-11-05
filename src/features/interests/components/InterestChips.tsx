import { Button } from '@/components/ui/button'
import { categoryIcons } from '@/config/category-icons'
import type { ServiceCategory } from '@/types/catalog'
import type { ID } from '@/types/common'

interface InterestChipsProps {
  categories: ServiceCategory[]
  selected: ReadonlySet<ID>
  onToggle: (id: ID) => void
  disabled?: boolean
}

/** One toggle per category for "What are you here for?". Buttons, never links. */
export function InterestChips({ categories, selected, onToggle, disabled }: InterestChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const Icon = categoryIcons[category.icon]
        const on = selected.has(category.id)
        return (
          <Button
            key={category.id}
            type="button"
            shape="pill"
            size="sm"
            variant={on ? 'default' : 'outline'}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(category.id)}
          >
            <Icon aria-hidden="true" />
            {category.name}
          </Button>
        )
      })}
    </div>
  )
}
