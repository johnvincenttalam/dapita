import { useId, useState } from 'react'

import { DatePicker } from '@/components/shared/DatePicker'
import { SearchInput } from '@/components/shared/SearchInput'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Demo, GallerySection } from '@/features/example/components/gallery/GallerySection'

export function FormControlsSection() {
  const id = useId()
  const [search, setSearch] = useState('')
  const [date, setDate] = useState<Date | undefined>()
  const [plan, setPlan] = useState('pro')
  const [notify, setNotify] = useState(true)

  return (
    <GallerySection
      id="form-controls"
      title="Form controls"
      description="Inputs share height, radius, focus ring and invalid styling. See the Forms page for validation."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo title="Text inputs" contentClassName="grid gap-5">
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>Default</FieldLabel>
            <Input id={`${id}-name`} placeholder="Jane Cooper" />
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor={`${id}-email`}>Invalid</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              defaultValue="jane@"
              aria-invalid
              aria-describedby={`${id}-email-error`}
            />
            <FieldError id={`${id}-email-error`}>Enter a valid email address</FieldError>
          </Field>
          <Field data-disabled>
            <FieldLabel htmlFor={`${id}-disabled`}>Disabled</FieldLabel>
            <Input id={`${id}-disabled`} disabled defaultValue="Read only value" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-bio`}>Textarea</FieldLabel>
            <Textarea id={`${id}-bio`} placeholder="Tell us a little about yourself" />
            <FieldDescription>Descriptions sit below the control.</FieldDescription>
          </Field>
        </Demo>

        <Demo title="Selection controls" contentClassName="grid gap-6">
          <div className="flex items-center gap-2">
            <Checkbox id={`${id}-terms`} defaultChecked />
            <Label htmlFor={`${id}-terms`}>Checkbox (checked)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`${id}-disabled-cb`} disabled />
            <Label htmlFor={`${id}-disabled-cb`}>Checkbox (disabled)</Label>
          </div>
          <RadioGroup value={plan} onValueChange={setPlan} aria-label="Plan" className="flex flex-wrap gap-4">
            {['free', 'pro', 'enterprise'].map((value) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem id={`${id}-plan-${value}`} value={value} />
                <Label htmlFor={`${id}-plan-${value}`} className="capitalize">
                  {value}
                </Label>
              </div>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-3">
            <Switch id={`${id}-notify`} checked={notify} onCheckedChange={setNotify} />
            <Label htmlFor={`${id}-notify`}>Email notifications {notify ? 'on' : 'off'}</Label>
          </div>
        </Demo>

        <Demo title="Select and date picker" contentClassName="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-fruit`}>Select</FieldLabel>
            <Select defaultValue="apple">
              <SelectTrigger id={`${id}-fruit`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Fruit</SelectLabel>
                  <SelectItem value="apple">Apple</SelectItem>
                  <SelectItem value="banana">Banana</SelectItem>
                  <SelectItem value="mango">Mango</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-date`}>Date picker</FieldLabel>
            <DatePicker id={`${id}-date`} value={date} onChange={setDate} className="sm:w-full" />
          </Field>
        </Demo>

        <Demo title="Search input" description="Clears with the × button or Escape." contentClassName="block">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search components…"
            className="sm:max-w-none"
          />
          <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
            {search ? `Searching for “${search}”` : 'Type to search'}
          </p>
        </Demo>
      </div>
    </GallerySection>
  )
}
