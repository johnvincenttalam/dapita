import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ProfileFields } from '@/features/settings/components/ProfileFields'
import { profileSchema, type ProfileInput } from '@/schemas/account'
import { defaultProfile } from '@/services/mock/data'
import { delay } from '@/services/mock/utils'

export function ProfileEditForm() {
  const failId = useId()
  const [simulateFailure, setSimulateFailure] = useState(false)

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultProfile,
    mode: 'onTouched',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    // MOCK: nothing leaves the browser.
    await delay(900)
    if (simulateFailure) {
      form.setError('root', { message: 'The mock server rejected the update. Turn off “Simulate failure” and retry.' })
      return
    }
    form.reset(values)
    toast.success('Profile updated (mock, nothing was saved)')
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Profile editing</h3>
        </CardTitle>
        <CardDescription>
          Pre-filled values, dirty tracking and a form-level error. The same fields power the Settings page.
        </CardDescription>
      </CardHeader>
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <CardContent className="space-y-6">
          <FormError message={form.formState.errors.root?.message} />
          <ProfileFields control={form.control} disabled={form.formState.isSubmitting} />
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-4 border-t pt-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Switch id={failId} checked={simulateFailure} onCheckedChange={setSimulateFailure} />
            <Label htmlFor={failId}>Simulate failure</Label>
          </div>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={!form.formState.isDirty || form.formState.isSubmitting}
              onClick={() => form.reset()}
            >
              Reset
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
              Save changes
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
