import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { photoMessages, photoRules } from '@/config/photos'

import type * as MockUtils from '@/services/mock/utils'
import { resizeImageToDataUrl } from '@/lib/resize-image'
import type { BusinessProfileInput } from '@/schemas/business'
import { authService, signUpConsents } from '@/services/auth.service'
import { bookingsService } from '@/services/bookings.service'
import { merchantBusinessService } from '@/services/merchant-business.service'
import { merchantServicesService } from '@/services/merchant-services.service'
import { updateMockDb } from '@/services/mock/db'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'
import type { WeeklyHours } from '@/types/business'

vi.mock('@/lib/resize-image', () => ({
  resizeImageToDataUrl: vi.fn(() => Promise.resolve('data:image/webp;base64,AA')),
}))

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
      message: 'Finish these first: business details, cover photo, services and cancellation policy.',
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

    updateMockDb((db) => {
      db.businesses
        .find((b) => b.id === id)!
        .photos.push({
          id: 'ph_test',
          url: '/images/shops/shop-the-good-cut-barbershop-cover.webp',
          alt: 'Lea’s Nail Bar',
          kind: 'cover',
        })
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

describe('shop photos (mock service)', () => {
  const photo = (name = 'a.jpg', type = 'image/jpeg') => new File(['x'], name, { type })
  const photosOf = async () => (await merchantBusinessService.getBusiness(BIZ)).business.photos

  beforeEach(() => {
    updateMockDb((db) => {
      db.businesses.find((b) => b.id === BIZ)!.photos = []
    })
  })

  it('replaces the one cover and keeps it first', async () => {
    await merchantBusinessService.setCoverPhoto(BIZ, photo())
    await merchantBusinessService.addGalleryPhoto(BIZ, photo())
    const first = (await photosOf()).find((p) => p.kind === 'cover')!
    const business = await merchantBusinessService.setCoverPhoto(BIZ, photo('b.jpg'))
    const covers = business.photos.filter((p) => p.kind === 'cover')
    expect(covers).toHaveLength(1)
    expect(covers[0]!.id).not.toBe(first.id)
    expect(covers[0]!.alt).toBe('The Good Cut Barbershop')
    expect(business.photos[0]!.kind).toBe('cover')
    expect(business.photos).toHaveLength(2)
  })

  it('takes eight gallery photos and refuses the ninth', async () => {
    for (let i = 0; i < photoRules.maxGalleryPhotos; i++) await merchantBusinessService.addGalleryPhoto(BIZ, photo())
    await expect(merchantBusinessService.addGalleryPhoto(BIZ, photo())).rejects.toMatchObject({
      status: 422,
      message: photoMessages.galleryFull,
    })
    const photos = await photosOf()
    expect(photos).toHaveLength(8)
    expect(photos[2]!.alt).toBe('The Good Cut Barbershop, photo 3')
  })

  it('rejects files that are not accepted photos or are missing', async () => {
    await expect(
      merchantBusinessService.addGalleryPhoto(BIZ, new File(['x'], 'a.gif', { type: 'image/gif' })),
    ).rejects.toMatchObject({ status: 422, message: photoMessages.notAPhoto })
    await expect(merchantBusinessService.setCoverPhoto(BIZ, undefined as unknown as File)).rejects.toMatchObject({
      status: 422,
      message: photoMessages.noFile,
    })
  })

  it('rejects a file named like a photo that can’t be decoded', async () => {
    await merchantBusinessService.setCoverPhoto(BIZ, photo())
    const before = await photosOf()
    for (const upload of [merchantBusinessService.setCoverPhoto, merchantBusinessService.addGalleryPhoto]) {
      vi.mocked(resizeImageToDataUrl).mockRejectedValueOnce(new Error('decode'))
      await expect(upload(BIZ, photo('menu.jpg'))).rejects.toMatchObject({
        status: 422,
        message: photoMessages.notAPhoto,
      })
    }
    expect(await photosOf()).toEqual(before)
  })

  it('removes gallery photos, but not the cover', async () => {
    await merchantBusinessService.setCoverPhoto(BIZ, photo())
    const withGallery = await merchantBusinessService.addGalleryPhoto(BIZ, photo())
    const [cover, gallery] = withGallery.photos
    await expect(merchantBusinessService.removePhoto(BIZ, cover!.id)).rejects.toMatchObject({
      status: 422,
      message: photoMessages.cantRemoveCover,
    })
    await expect(merchantBusinessService.removePhoto(BIZ, 'ph_nope')).rejects.toMatchObject({
      status: 404,
      message: photoMessages.notFound,
    })
    const after = await merchantBusinessService.removePhoto(BIZ, gallery!.id)
    expect(after.photos.map((p) => p.id)).toEqual([cover!.id])
  })

  it('reorders the gallery under the cover, and refuses a stale list', async () => {
    await merchantBusinessService.setCoverPhoto(BIZ, photo())
    await merchantBusinessService.addGalleryPhoto(BIZ, photo())
    await merchantBusinessService.addGalleryPhoto(BIZ, photo())
    const photos = await photosOf()
    const [cover, one, two] = photos
    const stale = [
      [one!.id],
      [one!.id, one!.id],
      [one!.id, two!.id, 'ph_nope'],
      [one!.id, 'ph_nope'],
      [cover!.id, one!.id],
    ]
    for (const ids of stale) {
      await expect(merchantBusinessService.reorderGallery(BIZ, ids)).rejects.toMatchObject({
        status: 422,
        message: photoMessages.staleOrder,
      })
    }
    const business = await merchantBusinessService.reorderGallery(BIZ, [two!.id, one!.id])
    expect(business.photos.map((p) => p.id)).toEqual([cover!.id, two!.id, one!.id])
  })

  it('is only for members of the business', async () => {
    signInAs('customer')
    await expect(merchantBusinessService.addGalleryPhoto(BIZ, photo())).rejects.toMatchObject({ status: 403 })
    await expect(merchantBusinessService.setCoverPhoto(BIZ, photo())).rejects.toMatchObject({ status: 403 })
    await expect(merchantBusinessService.removePhoto(BIZ, 'x')).rejects.toMatchObject({ status: 403 })
    await expect(merchantBusinessService.reorderGallery(BIZ, [])).rejects.toMatchObject({ status: 403 })
  })
})
