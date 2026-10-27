import { useId } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldContent, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { themeOptions } from '@/config/theme-options'
import { useTheme } from '@/hooks/use-theme'
import { isTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui-store'

/** Appearance preferences apply immediately and persist in localStorage, so there is no save button. */
export function AppearanceSettingsCard() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const density = useUiStore((state) => state.tableDensity)
  const setDensity = useUiStore((state) => state.setTableDensity)
  const densityId = useId()

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Appearance</h2>
        </CardTitle>
        <CardDescription>Changes apply instantly and are remembered in this browser.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FieldSet>
          <FieldLegend>Theme</FieldLegend>
          <FieldDescription>“System” follows your operating system (currently {resolvedTheme}).</FieldDescription>
          <RadioGroup
            value={theme}
            onValueChange={(value) => isTheme(value) && setTheme(value)}
            className="grid gap-3 sm:grid-cols-3"
          >
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <FieldLabel
                key={value}
                htmlFor={`theme-${value}`}
                className={cn('has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5')}
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value={value} id={`theme-${value}`} />
                  <FieldContent>
                    <span className="flex items-center gap-2 font-medium">
                      <Icon aria-hidden="true" className="size-4" />
                      {label}
                    </span>
                  </FieldContent>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </FieldSet>

        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor={densityId}>Compact tables</Label>
            <p className="text-sm text-muted-foreground">Reduce row height in data tables across the app.</p>
          </div>
          <Switch
            id={densityId}
            checked={density === 'compact'}
            onCheckedChange={(checked) => setDensity(checked ? 'compact' : 'comfortable')}
          />
        </div>
      </CardContent>
    </Card>
  )
}
