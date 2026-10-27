import { useQueryClient } from '@tanstack/react-query'
import { FlaskConicalIcon } from 'lucide-react'
import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { dashboardKeys } from '@/features/dashboard/api/queries'
import { env } from '@/lib/env'
import { useDemoStore, type DemoScenario } from '@/stores/demo-store'

const scenarios: { value: DemoScenario; label: string }[] = [
  { value: 'live', label: 'Mock data' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
]

function isScenario(value: string): value is DemoScenario {
  return scenarios.some((s) => s.value === value)
}

/** Lets you preview every data state of the dashboard. Only rendered when mock services are enabled. */
export function DemoStateSwitcher() {
  const id = useId()
  const queryClient = useQueryClient()
  const scenario = useDemoStore((state) => state.scenario)
  const setScenario = useDemoStore((state) => state.setScenario)

  if (!env.useMocks) return null

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
        <FlaskConicalIcon aria-hidden="true" className="size-4" />
        Demo state
      </Label>
      <Select
        value={scenario}
        onValueChange={(value) => {
          if (!isScenario(value)) return
          setScenario(value)
          // Reset (not just invalidate) so cached data is dropped and the new state shows immediately.
          void queryClient.resetQueries({ queryKey: dashboardKeys.all })
        }}
      >
        <SelectTrigger id={id} size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {scenarios.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
