import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingIndicator } from '@/components/feedback/LoadingIndicator'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useProfileQuery, useUpdateProfileMutation } from '@/features/settings/api/queries'
import { ProfileFields } from '@/features/settings/components/ProfileFields'
import { getErrorMessage } from '@/lib/api-client'
import { profileSchema, type ProfileInput } from '@/schemas/account'

const emptyProfile: ProfileInput = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  bio: '',
  website: '',
  timezone: '',
}

export function ProfileSettingsCard() {
  const profileQuery = useProfileQuery()
  const updateProfile = useUpdateProfileMutation()

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: emptyProfile,
    mode: 'onTouched',
  })

  // Load server values into the form once they arrive. `reset` also makes them the new
  // baseline, so "Reset" returns to the last saved state and `isDirty` is accurate.
  useEffect(() => {
    if (profileQuery.data) form.reset(profileQuery.data)
  }, [profileQuery.data, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      form.reset(await updateProfile.mutateAsync(values))
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Profile</h2>
        </CardTitle>
        <CardDescription>
          How others see you. Saving updates an in-memory mock; values reset when the page reloads.
        </CardDescription>
      </CardHeader>

      {profileQuery.isPending ? (
        <CardContent>
          <LoadingIndicator label="Loading profile…" />
        </CardContent>
      ) : profileQuery.isError ? (
        <CardContent>
          <ErrorState error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
        </CardContent>
      ) : (
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
          <CardContent className="space-y-6">
            <FormError message={form.formState.errors.root?.message} />
            <ProfileFields control={form.control} disabled={form.formState.isSubmitting} />
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
              Save profile
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
