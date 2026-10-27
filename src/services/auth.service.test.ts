import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { authService, mockVerificationToken, signUpConsents, type SignUpRequest } from '@/services/auth.service'
import { MOCK_ACCOUNTS_KEY } from '@/services/mock/accounts'
import { MOCK_PASSWORD, MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { merchantBusinessService } from '@/services/merchant-business.service'
import { profileService } from '@/services/profile.service'
import { shopsService } from '@/services/shops.service'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const customer: SignUpRequest = {
  accountType: 'customer',
  name: 'Lea Cruz',
  email: 'Lea@Example.com',
  phone: '09171234567',
  password: 'mirror42',
  consents: signUpConsents('customer'),
}

beforeEach(() => localStorage.clear())

describe('sign-up (mock auth service)', () => {
  it('creates an unverified customer account and signs it in', async () => {
    const user = await authService.signUp(customer)
    expect(user).toMatchObject({
      name: 'Lea Cruz',
      email: 'lea@example.com',
      roles: ['customer'],
      emailVerified: false,
    })
    expect(localStorage.getItem(MOCK_SESSION_KEY)).toBe(user.id)
    await expect(authService.getSession()).resolves.toMatchObject({ id: user.id })
  })

  it('never stores the password as typed', async () => {
    await authService.signUp(customer)
    expect(localStorage.getItem(MOCK_ACCOUNTS_KEY)).not.toContain('mirror42')
  })

  it('rejects an email that already has an account', async () => {
    await expect(authService.signUp({ ...customer, email: mockUsers.customer.email })).rejects.toMatchObject({
      status: 409,
      code: 'email_taken',
    })
  })

  it('signs a new account in with its own password only', async () => {
    await authService.signUp(customer)
    await authService.signOut()
    await expect(
      authService.signIn({ email: 'lea@example.com', password: MOCK_PASSWORD, remember: false }),
    ).rejects.toMatchObject({ status: 401 })
    await expect(
      authService.signIn({ email: 'lea@example.com', password: 'mirror42', remember: false }),
    ).resolves.toMatchObject({ name: 'Lea Cruz' })
  })

  it('creates a business owner with a membership for the named business', async () => {
    const owner = await authService.signUp({
      ...customer,
      accountType: 'business',
      email: 'owner@lea.ph',
      businessName: 'Lea’s Nail Bar',
      consents: signUpConsents('business'),
    })
    expect(owner.roles).toEqual(['customer', 'merchant_owner'])
    expect(owner.memberships).toEqual([expect.objectContaining({ businessName: 'Lea’s Nail Bar', role: 'owner' })])
  })

  it('starts the owner’s listing as a private draft', async () => {
    const owner = await authService.signUp({
      ...customer,
      accountType: 'business',
      email: 'owner@lea.ph',
      businessName: 'Lea’s Nail Bar',
      consents: signUpConsents('business'),
    })
    const businessId = owner.memberships[0]?.businessId ?? ''
    const { business } = await merchantBusinessService.getBusiness(businessId)
    expect(business).toMatchObject({
      name: 'Lea’s Nail Bar',
      slug: 'leas-nail-bar',
      status: 'draft',
      ownerId: owner.id,
    })
    await expect(shopsService.getShop('leas-nail-bar')).rejects.toMatchObject({ status: 404 })
  })

  it('records the accepted documents with their versions', async () => {
    await authService.signUp(customer)
    const consents = await profileService.getMyConsents()
    expect(consents.map((consent) => consent.purpose)).toEqual(['terms', 'privacy_notice'])
    expect(consents[0]?.version).toMatch(/^draft-/)
  })
})

describe('email verification and recovery (mock auth service)', () => {
  it('verifies with the token from the link', async () => {
    const user = await authService.signUp(customer)
    await expect(authService.verifyEmail(mockVerificationToken(user.id))).resolves.toMatchObject({
      emailVerified: true,
    })
    await expect(authService.getSession()).resolves.toMatchObject({ emailVerified: true })
  })

  it('rejects an unknown token', async () => {
    await expect(authService.verifyEmail('nope')).rejects.toMatchObject({ status: 400 })
  })

  it('answers a reset request the same way whether or not the account exists', async () => {
    await expect(authService.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined()
    await expect(authService.requestPasswordReset(mockUsers.customer.email)).resolves.toBeUndefined()
  })
})

describe('profile (mock profile service)', () => {
  it('requires a session', async () => {
    await expect(profileService.getMyProfile()).rejects.toMatchObject({ status: 401 })
  })

  it('updates the name and phone, and the session follows', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    const saved = await profileService.updateMyProfile({ name: 'Andrea R.', phone: '09181234567' })
    expect(saved).toMatchObject({ name: 'Andrea R.', phone: '09181234567' })
    await expect(authService.getSession()).resolves.toMatchObject({ name: 'Andrea R.' })
  })

  it('records one deletion request and keeps the account usable', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    const first = await profileService.requestAccountDeletion()
    const again = await profileService.requestAccountDeletion()
    expect(again.id).toBe(first.id)
    await expect(profileService.getMyProfile()).resolves.toMatchObject({ deletionRequest: { status: 'received' } })
    await expect(authService.getSession()).resolves.toMatchObject({ id: mockUsers.customer.id })
  })
})
