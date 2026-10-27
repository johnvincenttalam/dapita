import type { HttpContext } from '@adonisjs/core/http'
import encryption from '@adonisjs/core/services/encryption'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import Business from '#models/business'
import BusinessMembership from '#models/business_membership'
import Consent from '#models/consent'
import User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { toSessionUser } from '#services/accounts'
import { slugify, starterHours } from '#shared/domain'
import {
  forgotPasswordValidator,
  signInValidator,
  signUpValidator,
  verifyEmailValidator,
} from '#validators/auth'

const VERIFY_PURPOSE = 'verify-email'

/**
 * Session sign-in for the SPA (plan §8): an httpOnly cookie, never a token in
 * the browser. Emails aren't sent yet; verification links are written to the
 * server log instead.
 */
export default class AuthController {
  /** `null` when signed out, sent as JSON so the client can tell it from an error. */
  async session({ auth, response }: HttpContext) {
    const user = auth.user
    if (!user || user.suspendedAt) {
      return response.header('Content-Type', 'application/json; charset=utf-8').send('null')
    }
    return toSessionUser(user)
  }

  async signIn({ auth, request }: HttpContext) {
    const { email, password } = await request.validateUsing(signInValidator)
    const user = await User.verifyCredentials(email, password)
    if (user.suspendedAt)
      throw new ApiError('This account is suspended. Contact Dapita support.', 403)
    await auth.use('web').login(user)
    return toSessionUser(user)
  }

  async signOut({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.noContent()
  }

  async signUp({ auth, request }: HttpContext) {
    const input = await request.validateUsing(signUpValidator)
    if (await User.findBy('email', input.email)) {
      throw new ApiError(
        'An account with this email already exists. Sign in instead.',
        409,
        'email_taken'
      )
    }

    const user = await db.transaction(async (trx) => {
      const now = new Date().toISOString()
      const created = await User.create(
        {
          id: newId('usr'),
          name: input.name,
          email: input.email,
          password: input.password,
          phone: input.phone || null,
          roles: input.accountType === 'business' ? ['customer', 'merchant_owner'] : ['customer'],
          emailVerifiedAt: null,
          suspendedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        { client: trx }
      )
      await Consent.createMany(
        input.consents.map((consent) => ({
          id: newId('cns'),
          userId: created.id,
          purpose: consent.purpose,
          version: consent.version,
          grantedAt: now,
        })),
        { client: trx }
      )

      // A business sign-up starts a private draft listing, finished in onboarding and
      // reviewed before it goes live (MER-01).
      if (input.accountType === 'business' && input.businessName) {
        const business = await Business.create(
          {
            id: newId('biz'),
            slug: await uniqueSlug(input.businessName),
            ownerId: created.id,
            name: input.businessName,
            description: '',
            categoryIds: [],
            areaId: '',
            address: '',
            coordinates: null,
            phone: null,
            status: 'draft',
            bookingMethod: 'request',
            verified: false,
            featured: false,
            hours: structuredClone(starterHours),
            closures: [],
            policies: { cancellation: '', version: 0 },
            photos: [],
            rating: null,
            moderationNote: null,
            createdAt: now,
            updatedAt: now,
          },
          { client: trx }
        )
        await BusinessMembership.create(
          { userId: created.id, businessId: business.id, role: 'owner' },
          { client: trx }
        )
      }
      return created
    })

    await auth.use('web').login(user)
    logVerificationLink(user)
    return toSessionUser(user)
  }

  async verifyEmail({ request }: HttpContext) {
    const { token } = await request.validateUsing(verifyEmailValidator)
    const userId = encryption.decrypt<string>(token, VERIFY_PURPOSE)
    const user = userId ? await User.find(userId) : null
    if (!user) {
      throw new ApiError('This verification link is invalid or has expired.', 400, 'invalid_token')
    }
    if (!user.emailVerifiedAt) {
      user.emailVerifiedAt = new Date().toISOString()
      await user.save()
    }
    return toSessionUser(user)
  }

  /** Resolves either way, so it can't reveal who has an account. */
  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)
    logger.info({ email }, 'Password reset requested (email sending isn’t set up yet)')
    return response.noContent()
  }
}

/** "Lea’s Nail Bar" → "leas-nail-bar", then "leas-nail-bar-2" if taken. */
async function uniqueSlug(name: string) {
  const base = slugify(name)
  let slug = base
  for (let n = 2; await Business.findBy('slug', slug); n++) slug = `${base}-${n}`
  return slug
}

/** Stands in for the verification email until an email provider is chosen. */
function logVerificationLink(user: User) {
  const token = encryption.encrypt(user.id, '7 days', VERIFY_PURPOSE)
  const frontend = env.get('FRONTEND_URL', 'http://localhost:5173')
  logger.info(`Verify ${user.email}: ${frontend}/auth/verify?token=${encodeURIComponent(token)}`)
}
