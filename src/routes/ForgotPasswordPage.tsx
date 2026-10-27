import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { MockNotice } from '@/components/shared/MockNotice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePasswordResetMutation } from '@/features/auth/api/queries'
import { AuthPageHeader } from '@/features/auth/components/AuthPageHeader'
import { signInHref } from '@/features/auth/links'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getErrorMessage } from '@/lib/api-client'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/auth'

/**
 * Account recovery request (doc §13.1). The answer is the same whether or not an account
 * exists, so the form can't be used to find out who has one.
 */
export default function ForgotPasswordPage() {
  useDocumentTitle('Reset your password')
  const reset = usePasswordResetMutation()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      await reset.mutateAsync(email)
      setSentTo(email)
    } catch (error) {
      form.setError('root', { message: getErrorMessage(error) })
    }
  })

  const backToSignIn = (
    <p className="text-center text-sm">
      <Link to={signInHref()} className="font-medium text-primary underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </p>
  )

  if (sentTo) {
    return (
      <div className="space-y-8">
        <AuthPageHeader
          icon={MailCheckIcon}
          title="Check your email"
          description={`If there’s an account for ${sentTo}, we’ve sent a link to choose a new password.`}
        />
        <MockNotice>No email is sent in the prototype. Built-in accounts use the password shown on sign-in.</MockNotice>
        {backToSignIn}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AuthPageHeader
        title="Reset your password"
        description="Enter the email you signed up with and we’ll send you a link to choose a new password."
      />
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
        <FormError message={form.formState.errors.root?.message} title="We couldn’t send the link" />
        <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
          <FormField
            control={form.control}
            name="email"
            label="Email"
            required
            render={({ field, controlProps }) => (
              <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} {...controlProps} />
            )}
          />
        </fieldset>
        <Button type="submit" size="xl" shape="pill" fullWidth loading={form.formState.isSubmitting}>
          Send reset link
        </Button>
      </form>
      {backToSignIn}
    </div>
  )
}
