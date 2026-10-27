import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useUpdateProfileMutation } from '@/features/account/api/queries'
import { getErrorMessage } from '@/lib/api-client'
import { myProfileSchema, type MyProfileInput, type MyProfileValues } from '@/schemas/account'
import type { MyProfile } from '@/types/account'

/** Name and mobile number (CUS-06 "update basic profile"). */
export function ProfileForm({ profile }: { profile: MyProfile }) {
  const update = useUpdateProfileMutation()
  const form = useForm<MyProfileInput, unknown, MyProfileValues>({
    resolver: zodResolver(myProfileSchema),
    mode: 'onTouched',
    defaultValues: { name: profile.name, phone: profile.phone ?? '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync(values)
      // Saved values become the new baseline, so "Save changes" turns off again.
      form.reset({ name: saved.name, phone: saved.phone ?? '' })
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t save your profile" />
      <fieldset disabled={form.formState.isSubmitting} className="max-w-lg min-w-0">
        <FieldGroup>
          <FormField
            control={form.control}
            name="name"
            label="Your name"
            required
            render={({ field, controlProps }) => <Input autoComplete="name" {...field} {...controlProps} />}
          />
          <FormField
            control={form.control}
            name="phone"
            label="Mobile number"
            description="Optional."
            render={({ field, controlProps }) => (
              <Input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="0917 123 4567"
                {...field}
                {...controlProps}
              />
            )}
          />
        </FieldGroup>
      </fieldset>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          shape="pill"
          disabled={!form.formState.isDirty || form.formState.isSubmitting}
          onClick={() => form.reset()}
        >
          Reset
        </Button>
        <Button type="submit" shape="pill" disabled={!form.formState.isDirty} loading={form.formState.isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  )
}
