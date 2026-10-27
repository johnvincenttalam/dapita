import db from '@adonisjs/lucid/services/db'
import Consent from '#models/consent'
import DeletionRequest from '#models/deletion_request'
import User from '#models/user'
import { newId } from '#helpers/ids'
import { validateWith } from '#helpers/validate'
import {
  myProfileSchema,
  type ConsentRecord,
  type DeletionRequest as DeletionRequestData,
  type MyProfile,
} from '#shared/domain'

/**
 * The signed-in user's own account (CUS-06), ported from the mock in
 * src/services/profile.service.ts. Email changes need re-verification and
 * aren't offered yet.
 */

function toDeletionRequestData(request: DeletionRequest): DeletionRequestData {
  return { id: request.id, requestedAt: request.requestedAt, status: request.status }
}

export async function getMyProfile(user: User): Promise<MyProfile> {
  const request = await DeletionRequest.findBy('userId', user.id)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
    deletionRequest: request ? toDeletionRequestData(request) : undefined,
  }
}

export async function updateMyProfile(user: User, input: unknown) {
  const valid = validateWith(myProfileSchema, input)
  user.merge({ name: valid.name, phone: valid.phone || null, updatedAt: new Date().toISOString() })
  await user.save()
  return getMyProfile(user)
}

/** The documents accepted at sign-up, oldest first. */
export async function listMyConsents(user: User): Promise<ConsentRecord[]> {
  const consents = await Consent.query().where('userId', user.id).orderBy('grantedAt', 'asc')
  return consents.map((consent) => ({
    id: consent.id,
    purpose: consent.purpose,
    version: consent.version,
    grantedAt: consent.grantedAt,
  }))
}

/**
 * Asks for the account to be deleted. Support handles the request (doc §13.2); nothing
 * is deleted at once. Asking again returns the request already on file.
 */
export async function requestAccountDeletion(user: User) {
  const request = await db.transaction(async (trx) => {
    // Locking the account makes a double submit wait for the first, then find its request.
    await User.query({ client: trx }).where('id', user.id).forUpdate().firstOrFail()
    const existing = await DeletionRequest.query({ client: trx }).where('userId', user.id).first()
    if (existing) return existing
    return DeletionRequest.create(
      {
        id: newId('del'),
        userId: user.id,
        status: 'received',
        requestedAt: new Date().toISOString(),
      },
      { client: trx }
    )
  })
  return toDeletionRequestData(request)
}
