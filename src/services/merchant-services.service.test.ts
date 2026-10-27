import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import type { ServiceInput } from '@/schemas/service'
import { bookingsService } from '@/services/bookings.service'
import { merchantServicesService } from '@/services/merchant-services.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const BIZ = 'biz_good_cut'
const SLUG = 'the-good-cut-barbershop'

function signInAs(account: MockAccount | null) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  else localStorage.removeItem(MOCK_SESSION_KEY)
}

const input = (overrides: Partial<ServiceInput> = {}): ServiceInput => ({
  name: 'Buzz Cut',
  categoryId: 'sub_haircut',
  description: 'Clipper cut, one length all over.',
  requirements: '',
  price: { type: 'fixed', amount: 150 },
  durationMinutes: 20,
  bufferMinutes: 0,
  featured: false,
  active: true,
  ...overrides,
})

const publicNames = async () => (await shopsService.getShopServices(SLUG)).map((service) => service.name)

beforeEach(() => {
  localStorage.clear()
  signInAs('merchant')
})

describe('merchant services (mock service)', () => {
  it('is only for members of the business', async () => {
    signInAs(null)
    await expect(merchantServicesService.getServiceMenu(BIZ)).rejects.toMatchObject({ status: 401 })
    signInAs('customer')
    await expect(merchantServicesService.getServiceMenu(BIZ)).rejects.toMatchObject({ status: 403 })
    signInAs('merchant')
    await expect(merchantServicesService.getServiceMenu('biz_glow_go')).rejects.toMatchObject({ status: 403 })
  })

  it('returns every service in menu order with the business’s subcategories', async () => {
    const menu = await merchantServicesService.getServiceMenu(BIZ)
    expect(menu.services.map((service) => service.id)).toEqual([
      'svc_mens_haircut',
      'svc_hair_beard',
      'svc_cut_styling',
      'svc_kids_cut',
      'svc_hot_shave',
      'svc_mens_color',
    ])
    expect(menu.categories.map((category) => category.id)).toEqual(['sub_haircut', 'sub_beard'])
    expect(menu.shopSlug).toBe(SLUG)
  })

  it('adds a service at the end of the menu, visible to customers', async () => {
    const created = await merchantServicesService.createService(BIZ, input())
    expect(created).toMatchObject({ businessId: BIZ, name: 'Buzz Cut', active: true })
    expect((await merchantServicesService.getServiceMenu(BIZ)).services.at(-1)?.id).toBe(created.id)
    expect(await publicNames()).toContain('Buzz Cut')
  })

  it('rejects a name the menu already has, ignoring case and spaces', async () => {
    await expect(merchantServicesService.createService(BIZ, input({ name: '  men’s haircut ' }))).rejects.toMatchObject(
      { status: 409, message: 'You already have a service called “Men’s Haircut”.' },
    )
  })

  it('rejects a category outside the business and invalid prices', async () => {
    await expect(merchantServicesService.createService(BIZ, input({ categoryId: 'sub_facial' }))).rejects.toMatchObject(
      {
        status: 422,
      },
    )
    await expect(
      merchantServicesService.createService(BIZ, input({ price: { type: 'range', amount: 500, maxAmount: 300 } })),
    ).rejects.toMatchObject({ status: 422, message: 'The highest price must be more than the lowest' })
  })

  it('changes a service without touching the price on existing bookings', async () => {
    const updated = await merchantServicesService.updateService(
      BIZ,
      'svc_mens_haircut',
      input({ name: 'Men’s Haircut', price: { type: 'fixed', amount: 300 }, durationMinutes: 30 }),
    )
    expect(updated.price).toEqual({ type: 'fixed', amount: 300 })
    const booking = await bookingsService.getBusinessBooking('bk_gc_john')
    expect(booking.service.price).toEqual({ type: 'fixed', amount: 250 })
  })

  it('keeps its own name when renaming other fields', async () => {
    await expect(
      merchantServicesService.updateService(BIZ, 'svc_mens_haircut', input({ name: 'MEN’S HAIRCUT' })),
    ).resolves.toMatchObject({ name: 'MEN’S HAIRCUT' })
  })

  it('hides a service from customers', async () => {
    await merchantServicesService.updateService(BIZ, 'svc_hot_shave', input({ name: 'Hot Towel Shave', active: false }))
    expect(await publicNames()).not.toContain('Hot Towel Shave')
    expect((await merchantServicesService.getServiceMenu(BIZ)).services.map((s) => s.id)).toContain('svc_hot_shave')
  })

  it('moves a service within its category', async () => {
    const order = (await merchantServicesService.moveService(BIZ, 'svc_kids_cut', 'up')).map((service) => service.id)
    // Kids’ Haircut swaps with Haircut & Styling, the previous haircut; the beard service in between stays put.
    expect(order).toEqual([
      'svc_mens_haircut',
      'svc_hair_beard',
      'svc_kids_cut',
      'svc_cut_styling',
      'svc_hot_shave',
      'svc_mens_color',
    ])
    const unchanged = await merchantServicesService.moveService(BIZ, 'svc_mens_haircut', 'up')
    expect(unchanged.map((service) => service.id)).toEqual(order)
  })

  it('deletes a service only while it has no bookings', async () => {
    await expect(merchantServicesService.deleteService(BIZ, 'svc_mens_haircut')).rejects.toMatchObject({
      status: 409,
      message: 'Customers have booked this service, so it can’t be deleted. Hide it instead.',
    })
    const created = await merchantServicesService.createService(BIZ, input())
    await merchantServicesService.deleteService(BIZ, created.id)
    expect(await publicNames()).not.toContain('Buzz Cut')
  })

  it('can’t reach another business’s service', async () => {
    await expect(merchantServicesService.updateService(BIZ, 'svc_gg_cut', input())).rejects.toMatchObject({
      status: 404,
    })
  })
})
