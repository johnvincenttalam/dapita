import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type FieldPath } from 'react-hook-form'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingIndicator } from '@/components/feedback/LoadingIndicator'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup, FieldSeparator } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  useNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '@/features/settings/api/queries'
import { getErrorMessage } from '@/lib/api-client'
import { notificationPreferencesSchema, type NotificationPreferencesInput } from '@/schemas/account'

type ToggleName = Exclude<FieldPath<NotificationPreferencesInput>, 'emailDigest'>

const toggles: { name: ToggleName; label: string; description: string }[] = [
  { name: 'securityAlerts', label: 'Security alerts', description: 'Sign-ins from new devices and password changes.' },
  { name: 'mentions', label: 'Mentions', description: 'When someone mentions you in a comment.' },
  { name: 'productUpdates', label: 'Product updates', description: 'New features and improvements.' },
  { name: 'marketing', label: 'Tips and offers', description: 'Occasional marketing emails.' },
]

const fallback: NotificationPreferencesInput = {
  emailDigest: 'weekly',
  productUpdates: false,
  securityAlerts: true,
  mentions: false,
  marketing: false,
}

export function NotificationSettingsCard() {
  const prefsQuery = useNotificationPreferencesQuery()
  const updatePrefs = useUpdateNotificationPreferencesMutation()

  const form = useForm<NotificationPreferencesInput>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: fallback,
  })

  useEffect(() => {
    if (prefsQuery.data) form.reset(prefsQuery.data)
  }, [prefsQuery.data, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      form.reset(await updatePrefs.mutateAsync(values))
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Notifications</h2>
        </CardTitle>
        <CardDescription>Choose what we email you about. Mock only: no emails are ever sent.</CardDescription>
      </CardHeader>

      {prefsQuery.isPending ? (
        <CardContent>
          <LoadingIndicator label="Loading preferences…" />
        </CardContent>
      ) : prefsQuery.isError ? (
        <CardContent>
          <ErrorState error={prefsQuery.error} onRetry={() => void prefsQuery.refetch()} />
        </CardContent>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
          <CardContent>
            <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
              <FieldGroup>
                <FormError message={form.formState.errors.root?.message} />
                <FormField
                  control={form.control}
                  name="emailDigest"
                  label="Email digest"
                  description="A summary of activity in your workspaces."
                  render={({ field, controlProps }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldSeparator />
                {toggles.map((toggle) => (
                  <FormField
                    key={toggle.name}
                    control={form.control}
                    name={toggle.name}
                    label={toggle.label}
                    description={toggle.description}
                    orientation="horizontal"
                    controlPosition="end"
                    render={({ field, controlProps }) => (
                      <Switch
                        {...controlProps}
                        ref={field.ref}
                        name={field.name}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                ))}
              </FieldGroup>
            </fieldset>
          </CardContent>
          <CardFooter className="mt-6 flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={!form.formState.isDirty || form.formState.isSubmitting}
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
              Save preferences
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
