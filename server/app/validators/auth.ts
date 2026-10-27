import vine from '@vinejs/vine'

const email = () => vine.string().trim().toLowerCase().email().maxLength(254)

export const signInValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/** Mirrors the sign-up forms (src/schemas/auth.ts): customer, or business owner with a listing name. */
export const signUpValidator = vine.create({
  accountType: vine.enum(['customer', 'business'] as const),
  name: vine.string().trim().minLength(1).maxLength(80),
  email: email(),
  phone: vine
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ''))
    .optional(),
  password: vine.string().minLength(8).maxLength(128).regex(/[a-z]/i).regex(/[0-9]/),
  businessName: vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(80)
    .optional()
    .requiredWhen('accountType', '=', 'business'),
  consents: vine
    .array(
      vine.object({
        purpose: vine.enum(['terms', 'privacy_notice', 'merchant_policy'] as const),
        version: vine.string(),
      })
    )
    .minLength(1),
})

export const verifyEmailValidator = vine.create({
  token: vine.string(),
})

export const forgotPasswordValidator = vine.create({
  email: email(),
})
