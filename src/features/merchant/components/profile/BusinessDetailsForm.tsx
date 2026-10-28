import { zodResolver } from '@hookform/resolvers/zod'
import { CheckIcon, SparklesIcon } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Panel } from '@/components/shared/Panel'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { market } from '@/config/market'
import { useUpdateProfileMutation } from '@/features/merchant/api/business-queries'
import { suggestDescription } from '@/features/merchant/setup-suggestions'
import { getErrorMessage } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { businessProfileSchema, type BusinessProfileInput } from '@/schemas/business'
import type { BusinessProfile } from '@/services/merchant-business.service'

type DetailsFormInput = z.input<typeof businessProfileSchema>

const MAX_CATEGORIES = 3

const detailsValues = ({ business }: BusinessProfile): DetailsFormInput => ({
  name: business.name,
  description: business.description,
  categoryIds: business.categoryIds,
  areaId: business.areaId,
  address: business.address,
  phone: business.phone ?? '',
})

/** Name, description, categories, area, address and phone (MER-01). The shop's link never changes. */
interface BusinessDetailsFormProps {
  profile: BusinessProfile
  /** Onboarding: "Save and continue", then the next step. */
  submitLabel?: string
  onSaved?: () => void
}

export function BusinessDetailsForm({ profile, submitLabel = 'Save details', onSaved }: BusinessDetailsFormProps) {
  const update = useUpdateProfileMutation(profile.business.id)
  const form = useForm<DetailsFormInput, unknown, BusinessProfileInput>({
    resolver: zodResolver(businessProfileSchema),
    mode: 'onTouched',
    defaultValues: detailsValues(profile),
  })
  const [name, categoryIds, areaId] = useWatch({ control: form.control, name: ['name', 'categoryIds', 'areaId'] })
  const draft = suggestDescription({
    name,
    categoryIds,
    areaName: profile.areas.find((area) => area.id === areaId)?.name,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const business = await update.mutateAsync(values)
      form.reset(detailsValues({ ...profile, business }))
      // In onboarding the next step is the confirmation; a toast there would cover its button on phones.
      if (onSaved) onSaved()
      else toast.success('Business details saved.')
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t save your details" />
      <fieldset disabled={form.formState.isSubmitting} className="min-w-0 space-y-6">
        <Panel title="Your shop" description="How your shop appears in search and on your shop page.">
          <FieldGroup>
            <FormField
              control={form.control}
              name="name"
              label="Business name"
              required
              render={({ field, controlProps }) => (
                <Input maxLength={80} autoComplete="organization" {...field} {...controlProps} />
              )}
            />
            <Controller
              control={form.control}
              name="categoryIds"
              render={({ field, fieldState }) => {
                const selected = new Set(field.value)
                const full = selected.size >= MAX_CATEGORIES
                return (
                  <fieldset aria-invalid={fieldState.invalid || undefined} className="min-w-0 space-y-3">
                    <legend className="mb-3 type-subheading">
                      What does your shop offer?
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        (choose up to {MAX_CATEGORIES})
                      </span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {profile.categories.map((category) => {
                        const checked = selected.has(category.id)
                        return (
                          <label
                            key={category.id}
                            className={cn(
                              'relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                              checked
                                ? 'bg-primary text-primary-foreground ring-primary'
                                : 'bg-card ring-border hover:bg-muted',
                              !checked && full && 'cursor-not-allowed text-muted-foreground/60 hover:bg-card',
                            )}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              disabled={!checked && full}
                              onChange={() => {
                                field.onChange(
                                  checked
                                    ? field.value.filter((id) => id !== category.id)
                                    : [...field.value, category.id],
                                )
                                field.onBlur()
                              }}
                            />
                            {checked ? <CheckIcon aria-hidden="true" className="size-3.5" /> : null}
                            {category.name}
                          </label>
                        )
                      })}
                    </div>
                    {fieldState.error ? <p className="text-sm text-destructive">{fieldState.error.message}</p> : null}
                  </fieldset>
                )
              }}
            />
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="description"
                label="Description"
                description="What customers read first: what you’re known for and who you serve. A few sentences is enough."
                required
                render={({ field, controlProps }) => (
                  <Textarea rows={4} maxLength={1000} {...field} {...controlProps} />
                )}
              />
              {draft ? (
                <Button
                  type="button"
                  variant="outline"
                  shape="pill"
                  className="h-9 px-4"
                  onClick={() =>
                    form.setValue('description', draft, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
                  }
                >
                  <SparklesIcon aria-hidden="true" />
                  Write a first draft for me
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Choose what your shop offers and we can suggest a first draft.
                </p>
              )}
            </div>
          </FieldGroup>
        </Panel>

        <Panel title="Where to find you">
          <FieldGroup>
            <FormField
              control={form.control}
              name="areaId"
              label={`Area in ${market.city}`}
              description="Customers search by area."
              required
              className="sm:max-w-xs"
              render={({ field, controlProps }) => (
                <NativeSelect {...field} {...controlProps}>
                  {field.value ? null : (
                    <option value="" disabled>
                      Choose an area
                    </option>
                  )}
                  {profile.areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              label="Address"
              description="Street, building and a landmark, so customers can find you."
              required
              render={({ field, controlProps }) => (
                <Input
                  maxLength={200}
                  autoComplete="street-address"
                  placeholder="e.g. 2nd floor, 12 J.P. Laurel Ave, near Abreeza"
                  {...field}
                  {...controlProps}
                />
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              label="Mobile number"
              description="Optional. Shown on your shop page, so customers can call or text you."
              className="sm:max-w-xs"
              render={({ field, controlProps }) => (
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0917 123 4567"
                  {...field}
                  {...controlProps}
                />
              )}
            />
          </FieldGroup>
        </Panel>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          shape="pill"
          disabled={!form.formState.isDirty || form.formState.isSubmitting}
          onClick={() => form.reset()}
        >
          Undo changes
        </Button>
        <Button type="submit" shape="pill" loading={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
