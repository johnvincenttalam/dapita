import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSignInMutation } from '@/features/auth/api/queries'
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader'
import { getStartedHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getErrorMessage } from '@/lib/api-client'
import { env } from '@/lib/env'
import { getSafeRedirect, landingPathFor } from '@/lib/roles'
import { signInSchema, type SignInInput } from '@/schemas/auth'
import { MOCK_PASSWORD, mockAccountLabels, mockUsers, type MockAccount } from '@/services/mock/users'
import type { SessionUser } from '@/types/auth'

const mockAccounts = Object.keys(mockUsers) as MockAccount[]

export default function SignInPage() {
  useDocumentTitle('Sign in')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const signIn = useSignInMutation()

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '', remember: false },
  })

  const goOn = (user: SessionUser) => navigate(landingPathFor(user, searchParams.get('next')))

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await goOn(await signIn.mutateAsync(values))
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  const signInAs = async (account: MockAccount) => {
    const { email } = mockUsers[account]
    form.reset({ email, password: MOCK_PASSWORD, remember: false })
    await onSubmit()
  }

  return (
    <div className="space-y-8">
      <AuthPageHeader
        title="Welcome back"
        description="Sign in to book appointments, message shops and manage your business."
      />

      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
        <FormError message={form.formState.errors.root?.message} title="Sign-in failed" />
        <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
          <FieldGroup>
            <FormField
              control={form.control}
              name="email"
              label="Email"
              required
              render={({ field, controlProps }) => (
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} {...controlProps} />
              )}
            />
            <FormField
              control={form.control}
              name="password"
              label="Password"
              required
              render={({ field, controlProps }) => (
                <Input type="password" autoComplete="current-password" {...field} {...controlProps} />
              )}
            />
            <div className="flex items-center justify-between gap-4">
              <FormField
                control={form.control}
                name="remember"
                label="Keep me signed in"
                orientation="horizontal"
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
              <Link
                to="/auth/forgot-password"
                className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </FieldGroup>
        </fieldset>
        <Button type="submit" size="xl" shape="pill" fullWidth loading={form.formState.isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to {env.appName}?{' '}
        <Link
          to={getStartedHref(getSafeRedirect(searchParams.get('next')))}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>

      {env.useMocks ? (
        <section aria-labelledby="demo-accounts-heading" className="space-y-3">
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <h2 id="demo-accounts-heading" className="type-eyebrow text-muted-foreground">
              Prototype accounts
            </h2>
            <Separator className="flex-1" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {mockAccounts.map((account) => (
              <Button
                key={account}
                type="button"
                variant="outline"
                shape="pill"
                disabled={form.formState.isSubmitting}
                onClick={() => void signInAs(account)}
              >
                {mockAccountLabels[account]}
              </Button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Mock sign-in only: no real account or session is created. Password{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono">{MOCK_PASSWORD}</code>.
          </p>
        </section>
      ) : null}
    </div>
  )
}
