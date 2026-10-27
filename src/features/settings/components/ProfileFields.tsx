import { useWatch, type Control } from 'react-hook-form'

import { FormField } from '@/components/forms/FormField'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { BIO_MAX_LENGTH, timezoneOptions, type ProfileInput } from '@/schemas/account'

/** Profile inputs shared by the Settings page and the Forms playground. */
export function ProfileFields({ control, disabled }: { control: Control<ProfileInput>; disabled?: boolean }) {
  const bioLength = useWatch({ control, name: 'bio' }).length

  return (
    // A native fieldset disables every control inside it, including Radix triggers.
    <fieldset disabled={disabled} className="min-w-0">
      <FieldGroup>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="firstName"
            label="First name"
            required
            render={({ field, controlProps }) => <Input autoComplete="given-name" {...field} {...controlProps} />}
          />
          <FormField
            control={control}
            name="lastName"
            label="Last name"
            required
            render={({ field, controlProps }) => <Input autoComplete="family-name" {...field} {...controlProps} />}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="email"
            label="Email"
            required
            render={({ field, controlProps }) => (
              <Input type="email" autoComplete="email" {...field} {...controlProps} />
            )}
          />
          <FormField
            control={control}
            name="username"
            label="Username"
            description="Lowercase letters, numbers, hyphens and underscores."
            required
            render={({ field, controlProps }) => <Input autoComplete="username" {...field} {...controlProps} />}
          />
        </div>
        <FormField
          control={control}
          name="bio"
          label="Bio"
          description={
            <span className="flex justify-between gap-4">
              <span>Shown on your public profile.</span>
              <span className="tabular-nums">
                {bioLength}/{BIO_MAX_LENGTH}
              </span>
            </span>
          }
          render={({ field, controlProps }) => <Textarea rows={3} {...field} {...controlProps} />}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={control}
            name="website"
            label="Website"
            render={({ field, controlProps }) => (
              <Input type="url" inputMode="url" placeholder="https://" {...field} {...controlProps} />
            )}
          />
          <FormField
            control={control}
            name="timezone"
            label="Timezone"
            required
            render={({ field, controlProps }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...controlProps} onBlur={field.onBlur} ref={field.ref} className="w-full">
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </FieldGroup>
    </fieldset>
  )
}
