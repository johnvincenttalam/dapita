import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import type { BusinessProfileInput } from '@/schemas/business'
import { authService, signUpConsents } from '@/services/auth.service'
import { bookingsService } from '@/services/bookings.service'
import { merchantBusinessService } from '@/services/merchant-business.service'
import { merchantServicesService } from '@/services/merchant-services.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import type { WeeklyHours } from '@/types/business'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')
const BIZ = 'biz_good_cut'
const SLUG = 'the-good-cut-barbershop'

function signInAs(account: MockAccount | null) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  else localStorage.removeItem(MOCK_SESSION_KEY)
}

const profile = (overrides: Partial<BusinessProfileInput> = {}): BusinessProfileInput => ({
  name: 'The Good Cut Barbershop',
  description: 'Modern barbershop offering quality cuts in Davao City.',
  categoryIds: ['cat_barber'],
  areaId: 'area_poblacion',
  address: '118 C.M. Recto St, Poblacion, Davao City',
  phone: '',
  ...overrides,
})

const day = (open: string, close: string) => [{ open, close }]
const week = (overrides: Partial<WeeklyHours> = {}): WeeklyHours => ({
  0: [],
  1: day('10:00', '21:00'),
  2: day('10:00', '21:00'),
  3: day('10:00', '21:00'),
  4: day('10:00', '21:00'),
  5: day('10:00', '21:00'),
  6: day('09:00', '18:00'),
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  signInAs('merchant')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('merchant business profile (mock service)', () => {
  it('is only for members of the business', async () => {
    signInAs(null)
    await expect(merchantBusinessService.getBusiness(BIZ)).rejects.toMatchObject({ status: 401 })
    signInAs('customer')
    await expect(merchantBusinessService.getBusiness(BIZ)).rejects.toMatchObject({ status: 403 })
  })

  it('returns the business with the areas and top-level categories to choose from', async () => {
    const { business, areas, categories } = await merchantBusinessService.getBusiness(BIZ)
    expect(business).toMatchObject({ id: BIZ, slug: SLUG, name: 'The Good Cut Barbershop' })
    expect(areas.map((area) => area.id)).toContain('area_lanang')
    expect(categories.every((category) => !category.parentId)).toBe(true)
    expect(categories.map((category) => category.id)).toContain('cat_barber')
  })

  it('updates the public listing and the name the owner sees, keeping the link', async () => {
    await merchantBusinessService.updateProfile(BIZ, profile({ name: 'Good Cut Davao', areaId: 'area_lanang' }))
    expect(await shopsService.getShop(SLUG)).toMatchObject({ name: 'Good Cut Davao', area: { id: 'area_lanang' } })
    expect((await authService.getSession())?.memberships[0]?.businessName).toBe('Good Cut Davao')
  })

  it('rejects an unknown area or category', async () => {
    await expect(merchantBusinessService.updateProfile(BIZ, profile({ areaId: 'area_mars' }))).rejects.toMatchObject({
      status: 422,
    })
    await expect(
      merchantBusinessService.updateProfile(BIZ, profile({ categoryIds: ['sub_haircut'] })),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('saves opening hours that bookings then follow', async () => {
    // Closed on Fridays from now on.
    await merchantBusinessService.updateHours(BIZ, week({ 5: [] }))
    expect((await shopsService.getShop(SLUG)).hours[5]).toEqual([])
    signInAs('customer')
    await expect(
      bookingsService.createBooking({
        serviceId: 'svc_mens_haircut',
        staffId: null,
        start: '2026-10-23T06:00:00.000Z', // Friday 23 Oct, 2:00 PM
        idempotencyKey: 'k1',
      }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('rejects overlapping hours on one day', async () => {
    await expect(
      merchantBusinessService.updateHours(BIZ, week({ 1: [...day('10:00', '14:00'), ...day('13:00', '18:00')] })),
    ).rejects.toMatchObject({ status: 422, message: 'Opening times on the same day can’t overlap' })
  })

  it('adds and removes a closure', async () => {
    const { closures } = await merchantBusinessService.addClosure(BIZ, {
      startDate: '2026-12-24',
      endDate: '2026-12-26',
      reason: 'Christmas',
    })
    const added = closures.find((closure) => closure.reason === 'Christmas')
    expect(added).toMatchObject({ startDate: '2026-12-24', endDate: '2026-12-26' })

    const after = await merchantBusinessService.deleteClosure(BIZ, added?.id ?? '')
    expect(after.closures.map((closure) => closure.reason)).not.toContain('Christmas')
  })

  it('won’t add a closure that has already ended', async () => {
    await expect(
      merchantBusinessService.addClosure(BIZ, { startDate: '2026-10-19', endDate: '2026-10-20', reason: '' }),
    ).rejects.toMatchObject({ status: 422, message: 'That closure has already passed. Choose today or a later date.' })
  })

  it('starts a new policy version only when the text changes', async () => {
    const before = (await merchantBusinessService.getBusiness(BIZ)).business.policies
    const same = await merchantBusinessService.updatePolicies(BIZ, {
      cancellation: before.cancellation,
      noShow: before.noShow ?? '',
      deposit: before.deposit ?? '',
    })
    expect(same.policies.version).toBe(before.version)

    const changed = await merchantBusinessService.updatePolicies(BIZ, {
      cancellation: 'Free cancellation up to 6 hours before your appointment.',
      noShow: '',
      deposit: '',
    })
    expect(changed.policies).toEqual({
      cancellation: 'Free cancellation up to 6 hours before your appointment.',
      version: before.version + 1,
    })
  })

  it('won’t submit a listing that is already live', async () => {
    await expect(merchantBusinessService.submitForReview(BIZ)).rejects.toMatchObject({
      status: 409,
      message: 'Your listing is already live.',
    })
  })
})

describe('submitting a new listing for review', () => {
  async function newOwner() {
    signInAs(null)
    const owner = await authService.signUp({
      accountType: 'business',
      name: 'Lea Cruz',
      email: 'owner@lea.ph',
      phone: '09171234567',
      password: 'mirror42',
      businessName: 'Lea’s Nail Bar',
      consents: signUpConsents('business'),
    })
    return owner.memberships[0]?.businessId ?? ''
  }

  it('says what is still missing', async () => {
    const id = await newOwner()
    await expect(merchantBusinessService.submitForReview(id)).rejects.toMatchObject({
      status: 422,
      message: 'Finish these first: business details, services and cancellation policy.',
    })
  })

  it('sends a complete listing to review, still private', async () => {
    const id = await newOwner()
    await merchantBusinessService.updateProfile(
      id,
      profile({ name: 'Lea’s Nail Bar', categoryIds: ['cat_nails'], areaId: 'area_bajada' }),
    )
    await merchantServicesService.createService(id, {
      name: 'Gel Manicure',
      categoryId: 'sub_manicure',
      description: '',
      requirements: '',
      price: { type: 'fixed', amount: 450 },
      durationMinutes: 60,
      bufferMinutes: 0,
      featured: false,
      active: true,
    })
    await merchantBusinessService.updatePolicies(id, {
      cancellation: 'Free cancellation up to 3 hours before your appointment.',
      noShow: '',
      deposit: '',
    })

    const submitted = await merchantBusinessService.submitForReview(id)
    expect(submitted.status).toBe('pending_review')
    await expect(shopsService.getShop('leas-nail-bar')).rejects.toMatchObject({ status: 404 })
    await expect(merchantBusinessService.submitForReview(id)).rejects.toMatchObject({
      status: 409,
      message: 'Your listing is already waiting for review.',
    })
  })
})
