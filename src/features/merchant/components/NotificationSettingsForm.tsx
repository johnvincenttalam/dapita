import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { useUpdateNotificationSettingsMutation } from '@/features/merchant/api/settings-queries'
import { getErrorMessage } from '@/lib/api-client'
import type { MerchantNotificationSettings } from '@/types/settings'

const options: { name: keyof MerchantNotificationSettings; label: string; description: string }[] = [
  { name: 'newRequest', label: 'New booking requests', description: 'As soon as a customer asks for a time.' },
  {
    name: 'requestExpiring',
    label: 'Requests about to expire',
    description: 'An hour before an unanswered request runs out.',
  },
  { name: 'newMessage', label: 'New messages', description: 'When a customer writes to your shop.' },
  {
    name: 'dailySummary',
    label: 'Daily summary',
    description: 'Each morning: today’s appointments and what’s waiting for you.',
  },
]

/** Which emails this person gets about the business. Saved per person, so staff can choose their own. */
export function NotificationSettingsForm({
  businessId,
  settings,
}: {
  businessId: string
  settings: MerchantNotificationSettings
}) {
  const update = useUpdateNotificationSettingsMutation(businessId)
  const form = useForm<MerchantNotificationSettings>({ defaultValues: settings })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      form.reset(await update.mutateAsync(values))
      toast.success('Notification settings saved.')
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-5">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t save your choices" />
      <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
        <legend className="sr-only">Email me about</legend>
        <FieldGroup>
          {options.map((option) => (
            <Controller
              key={option.name}
              control={form.control}
              name={option.name}
              render={({ field }) => {
                const id = `notify-${option.name}`
                return (
                  <Field orientation="horizontal" className="justify-between">
                    <FieldContent>
                      <FieldLabel htmlFor={id}>{option.label}</FieldLabel>
                      <FieldDescription id={`${id}-description`}>{option.description}</FieldDescription>
                    </FieldContent>
                    <Switch
                      id={id}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-describedby={`${id}-description`}
                    />
                  </Field>
                )
              }}
            />
          ))}
        </FieldGroup>
      </fieldset>
      <div className="flex justify-end border-t border-border/70 pt-4">
        <Button type="submit" shape="pill" disabled={!form.formState.isDirty} loading={form.formState.isSubmitting}>
          Save notifications
        </Button>
      </div>
    </form>
  )
}
