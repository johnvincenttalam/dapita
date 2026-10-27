import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { DatePicker } from '@/components/shared/DatePicker'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage } from '@/lib/api-client'
import { registrationSchema, roleOptions, type RegistrationInput } from '@/schemas/auth'
import { accountService, MOCK_TAKEN_EMAIL } from '@/services/account.service'

const today = new Date()
const oldestBirthYear = new Date(today.getFullYear() - 100, 0, 1)

export function RegistrationForm() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      role: undefined,
      dateOfBirth: undefined,
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await accountService.register(values)
      setRegisteredEmail(values.email)
      form.reset()
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Registration</h3>
        </CardTitle>
        <CardDescription>
          Cross-field validation (password confirmation), dates, selects and a server error. Use{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{MOCK_TAKEN_EMAIL}</code> to trigger the mock “email
          taken” response.
        </CardDescription>
      </CardHeader>
      <form onSubmit={(event) => void onSubmit(event)} noValidate>
        <CardContent className="space-y-6">
          {registeredEmail ? (
            <Alert variant="success">
              <CircleCheckIcon aria-hidden="true" />
              <AlertTitle>Mock registration succeeded</AlertTitle>
              <AlertDescription>
                No account was created and nothing was sent anywhere. {registeredEmail} only exists in this message.
              </AlertDescription>
            </Alert>
          ) : null}
          <FormError message={form.formState.errors.root?.message} />

          <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
            <FieldGroup>
              <FormField
                control={form.control}
                name="fullName"
                label="Full name"
                required
                render={({ field, controlProps }) => <Input autoComplete="name" {...field} {...controlProps} />}
              />
              <FormField
                control={form.control}
                name="email"
                label="Email"
                required
                render={({ field, controlProps }) => (
                  <Input type="email" autoComplete="email" {...field} {...controlProps} />
                )}
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="role"
                  label="Role"
                  required
                  render={({ field, controlProps }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger {...controlProps} ref={field.ref} onBlur={field.onBlur} className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  label="Date of birth"
                  required
                  render={({ field, controlProps }) => (
                    <DatePicker
                      {...controlProps}
                      className="sm:w-full"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      captionLayout="dropdown"
                      startMonth={oldestBirthYear}
                      endMonth={today}
                      disabled={{ after: today }}
                      placeholder="Select a date"
                    />
                  )}
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  label="Password"
                  description="At least 8 characters with a letter and a number."
                  required
                  render={({ field, controlProps }) => (
                    <Input type="password" autoComplete="new-password" {...field} {...controlProps} />
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  label="Confirm password"
                  required
                  render={({ field, controlProps }) => (
                    <Input type="password" autoComplete="new-password" {...field} {...controlProps} />
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="acceptTerms"
                label="I accept the terms and privacy policy"
                description="Placeholder terms. There is no real agreement in this demo."
                orientation="horizontal"
                required
                render={({ field, controlProps }) => (
                  <Checkbox
                    {...controlProps}
                    ref={field.ref}
                    name={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FieldGroup>
          </fieldset>
        </CardContent>
        <CardFooter className="mt-6 flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            disabled={form.formState.isSubmitting}
            onClick={() => {
              form.reset()
              setRegisteredEmail(null)
            }}
          >
            Clear
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            Create account
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
