import { z } from 'zod'

import { emailField, optionalPhMobileField, passwordField, phMobileField, requiredString } from '@/schemas/common'

export const roleOptions = [
  { value: 'developer', label: 'Developer' },
  { value: 'designer', label: 'Designer' },
  { value: 'manager', label: 'Product manager' },
  { value: 'other', label: 'Other' },
] as const

const MIN_AGE = 16

function yearsSince(date: Date) {
  const now = new Date()
  let years = now.getFullYear() - date.getFullYear()
  const beforeBirthday =
    now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  if (beforeBirthday) years -= 1
  return years
}

const passwordPair = z.object({
  password: passwordField,
  confirmPassword: z.string().min(1, 'Confirm your password'),
})

export const registrationSchema = z
  .object({
    fullName: requiredString('Full name').max(80, 'Full name must be 80 characters or fewer'),
    email: emailField,
    role: z.enum(['developer', 'designer', 'manager', 'other'], { error: 'Select your role' }),
    dateOfBirth: z
      .date({ error: 'Date of birth is required' })
      .refine((date) => yearsSince(date) >= MIN_AGE, `You must be at least ${MIN_AGE} years old`),
    ...passwordPair.shape,
    acceptTerms: z.boolean().refine((value) => value, 'You must accept the terms to continue'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match',
    // Object refinements normally wait until every field is valid. Run this one as soon
    // as both password fields are valid, so the mismatch shows alongside other errors.
    when: (payload) => passwordPair.safeParse(payload.value).success,
  })

export type RegistrationInput = z.infer<typeof registrationSchema>

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean(),
})

export type SignInInput = z.infer<typeof signInSchema>

// Sign-up (plan §8, item 6): email + password, phone optional for customers.
// The template's `registrationSchema` above stays for the /dev forms demo.

const accountName = requiredString('Your name').max(80, 'Name must be 80 characters or fewer')
const acceptLegal = z.boolean().refine((value) => value, 'Accept the terms to create an account')

export const customerSignUpSchema = z.object({
  name: accountName,
  email: emailField,
  phone: optionalPhMobileField,
  password: passwordField,
  acceptTerms: acceptLegal,
})

export type CustomerSignUpInput = z.input<typeof customerSignUpSchema>
export type CustomerSignUpValues = z.output<typeof customerSignUpSchema>

/**
 * Business owner account (MER-01, doc §7.4). ASSUMPTION: a mobile number is required
 * so the Dapita team can verify the business contact (doc §15.2).
 */
export const businessSignUpSchema = z.object({
  name: accountName,
  businessName: requiredString('Business name').max(80, 'Business name must be 80 characters or fewer'),
  email: emailField,
  phone: phMobileField,
  password: passwordField,
  acceptTerms: acceptLegal,
})

export type BusinessSignUpInput = z.input<typeof businessSignUpSchema>
export type BusinessSignUpValues = z.output<typeof businessSignUpSchema>

export const forgotPasswordSchema = z.object({ email: emailField })

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
