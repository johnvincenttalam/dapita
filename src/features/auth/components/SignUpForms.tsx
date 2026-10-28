import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { LegalConsentLabel } from '@/features/auth/components/LegalConsentLabel'
import { useSignUp } from '@/features/auth/use-sign-up'
import {
  businessSignUpSchema,
  customerSignUpSchema,
  type BusinessSignUpInput,
  type BusinessSignUpValues,
  type CustomerSignUpInput,
  type CustomerSignUpValues,
} from '@/schemas/auth'
import { signUpConsents } from '@/services/auth.service'

const PASSWORD_HINT = 'At least 8 characters, with a letter and a number.'

/** Customer sign-up: name, email, optional mobile and password (plan §8, item 6). */
export function CustomerSignUpForm({ next }: { next: string }) {
  const form = useForm<CustomerSignUpInput, unknown, CustomerSignUpValues>({
    resolver: zodResolver(customerSignUpSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', phone: '', password: '', acceptTerms: false },
  })
  const submit = useSignUp(next, {
    onEmailTaken: (message) => form.setError('email', { message }, { shouldFocus: true }),
    onError: (message) => form.setError('root', { message }),
  })

  const onSubmit = form.handleSubmit(({ name, email, phone, password }) =>
    submit({
      accountType: 'customer',
      name,
      email,
      phone: phone || undefined,
      password,
      consents: signUpConsents('customer'),
    }),
  )

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t create your account" />
      <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
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
            name="email"
            label="Email"
            required
            render={({ field, controlProps }) => (
              <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} {...controlProps} />
            )}
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
          <FormField
            control={form.control}
            name="password"
            label="Password"
            description={PASSWORD_HINT}
            required
            render={({ field, controlProps }) => (
              <PasswordInput autoComplete="new-password" {...field} {...controlProps} />
            )}
          />
          <FormField
            control={form.control}
            name="acceptTerms"
            label={<LegalConsentLabel accountType="customer" />}
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
        </FieldGroup>
      </fieldset>
      <Button type="submit" size="xl" shape="pill" fullWidth loading={form.formState.isSubmitting}>
        Create account
      </Button>
    </form>
  )
}

/**
 * Business owner sign-up (MER-01, doc §7.4): the owner's account and the business
 * name. The listing details come next, in merchant onboarding.
 */
export function BusinessSignUpForm({ next }: { next: string }) {
  const form = useForm<BusinessSignUpInput, unknown, BusinessSignUpValues>({
    resolver: zodResolver(businessSignUpSchema),
    mode: 'onTouched',
    defaultValues: { name: '', businessName: '', email: '', phone: '', password: '', acceptTerms: false },
  })
  const submit = useSignUp(next, {
    onEmailTaken: (message) => form.setError('email', { message }, { shouldFocus: true }),
    onError: (message) => form.setError('root', { message }),
  })

  const onSubmit = form.handleSubmit(({ name, businessName, email, phone, password }) =>
    submit({
      accountType: 'business',
      name,
      businessName,
      email,
      phone,
      password,
      consents: signUpConsents('business'),
    }),
  )

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-6">
      <FormError message={form.formState.errors.root?.message} title="We couldn’t create your account" />
      <fieldset disabled={form.formState.isSubmitting} className="min-w-0">
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
            name="businessName"
            label="Business name"
            description="As customers know it, e.g. the name on your signboard or Facebook page."
            required
            render={({ field, controlProps }) => <Input autoComplete="organization" {...field} {...controlProps} />}
          />
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
            name="phone"
            label="Mobile number"
            description="So we can call or text to confirm your shop before it goes live. We’ll also suggest it as your shop’s contact number."
            required
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
          <FormField
            control={form.control}
            name="password"
            label="Password"
            description={PASSWORD_HINT}
            required
            render={({ field, controlProps }) => (
              <PasswordInput autoComplete="new-password" {...field} {...controlProps} />
            )}
          />
          <FormField
            control={form.control}
            name="acceptTerms"
            label={<LegalConsentLabel accountType="business" />}
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
        </FieldGroup>
      </fieldset>
      <Button type="submit" size="xl" shape="pill" fullWidth loading={form.formState.isSubmitting}>
        Create business account
      </Button>
    </form>
  )
}
