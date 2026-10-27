import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { canTransition } from '@/lib/booking-status'
import { createSeedDb } from '@/services/mock/db'
import { shopsService } from '@/services/shops.service'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila.
const NOW = new Date('2026-10-21T03:00:00Z')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

const names = (result: { items: { name: string }[] }) => result.items.map((shop) => shop.name)

describe('shop search (mock service)', () => {
  it('lists approved shops only, featured first', async () => {
    const result = await shopsService.searchShops({})
    expect(result.total).toBe(11)
    expect(names(result)).not.toContain('Ritz Grooming Lounge')
    expect(result.items.slice(0, 4).every((shop) => shop.featured)).toBe(true)
  })

  it('matches every keyword across names, services and categories', async () => {
    expect(names(await shopsService.searchShops({ q: 'fade haircut' }))).toEqual(['Fade Factory Barbers'])
    expect(names(await shopsService.searchShops({ q: 'HILOT' }))).toEqual(['Hilot & Wellness'])
    expect((await shopsService.searchShops({ q: 'tattoo' })).total).toBe(0)
  })

  it('filters by category, subcategory and area', async () => {
    expect(names(await shopsService.searchShops({ category: 'spa-massage', sort: 'name' }))).toEqual([
      'Hilot & Wellness',
      'Kalma Massage & Wellness',
      'Serenity Wellness Spa',
    ])
    expect(names(await shopsService.searchShops({ category: 'facial' }))).toEqual(['Serenity Wellness Spa'])
    expect(names(await shopsService.searchShops({ area: 'lanang', sort: 'name' }))).toEqual([
      'Glow & Go Beauty Salon',
      'Studio Mane Hair Salon',
    ])
  })

  it('filters by maximum price and by open now', async () => {
    expect(names(await shopsService.searchShops({ priceMax: 160, sort: 'name' }))).toEqual([
      'Fade Factory Barbers',
      'Polished Nail Studio',
    ])
    const open = names(await shopsService.searchShops({ openNow: true, pageSize: 50 }))
    expect(open).toContain('The Good Cut Barbershop')
    // Serenity opens at noon, Kalma at 1 PM, and Studio Mane is closed on Wednesdays.
    expect(open).not.toContain('Serenity Wellness Spa')
    expect(open).not.toContain('Kalma Massage & Wellness')
    expect(open).not.toContain('Studio Mane Hair Salon')
  })

  it('paginates', async () => {
    const page = await shopsService.searchShops({ page: 3, pageSize: 5 })
    expect(page).toMatchObject({ total: 11, page: 3, pageSize: 5 })
    expect(page.items).toHaveLength(1)
  })
})

describe('shop profile (mock service)', () => {
  it('returns the public profile without internal fields', async () => {
    const shop = await shopsService.getShop('the-good-cut-barbershop')
    expect(shop).toMatchObject({ name: 'The Good Cut Barbershop', area: { name: 'Poblacion' }, priceFrom: 180 })
    expect(shop).not.toHaveProperty('ownerId')
    expect(shop).not.toHaveProperty('status')
    expect(shop.rating).toBeUndefined()
  })

  it('hides listings that aren’t approved', async () => {
    await expect(shopsService.getShop('ritz-grooming-lounge')).rejects.toMatchObject({ status: 404 })
  })

  it('ignores "price on consultation" when computing the lowest price', async () => {
    expect((await shopsService.getShop('bloom-makeup-atelier')).priceFrom).toBe(1500)
  })

  it('returns services in order and staff only where kept', async () => {
    const services = await shopsService.getShopServices('the-good-cut-barbershop')
    expect(services.slice(0, 2).map((service) => service.name)).toEqual(['Men’s Haircut', 'Hair + Beard Trim'])
    expect((await shopsService.getShopStaff('the-good-cut-barbershop')).map((s) => s.displayName)).toEqual([
      'Ken',
      'Mark',
      'James',
    ])
    expect(await shopsService.getShopStaff('polished-nail-studio')).toEqual([])
  })
})

describe('mock seed data', () => {
  const db = createSeedDb(NOW)

  it('links every record to existing parents', () => {
    const categoryIds = new Set(db.categories.map((category) => category.id))
    const businessIds = new Set(db.businesses.map((business) => business.id))
    const serviceIds = new Set(db.services.map((service) => service.id))

    for (const business of db.businesses) {
      expect(business.categoryIds.every((id) => categoryIds.has(id))).toBe(true)
      expect(db.areas.some((area) => area.id === business.areaId)).toBe(true)
    }
    for (const service of db.services) {
      expect(businessIds.has(service.businessId)).toBe(true)
      expect(categoryIds.has(service.categoryId)).toBe(true)
    }
    for (const member of db.staff) {
      const services = db.services.filter((service) => member.serviceIds.includes(service.id))
      expect(services.every((service) => service.businessId === member.businessId)).toBe(true)
      expect(member.serviceIds.every((id) => serviceIds.has(id))).toBe(true)
    }
  })

  it('has no invented ratings or phone numbers', () => {
    expect(db.businesses.every((business) => business.rating === undefined && business.phone === undefined)).toBe(true)
  })

  it('builds booking histories the state machine allows', () => {
    for (const booking of db.bookings) {
      const events = db.bookingEvents.filter((event) => event.bookingId === booking.id)
      expect(events[0]?.from).toBe('draft')
      events.forEach((event, index) => {
        expect(canTransition(event.from, event.action, event.actor)).toBe(true)
        if (index > 0) expect(event.from).toBe(events[index - 1]?.to)
      })
      expect(events.at(-1)?.to).toBe(booking.status)
    }
  })

  it('keeps open requests answerable at seed time', () => {
    const open = db.bookings.filter((booking) => ['pending', 'alternative_proposed'].includes(booking.status))
    expect(open.length).toBeGreaterThan(0)
    expect(open.every((booking) => booking.respondBy && new Date(booking.respondBy) > NOW)).toBe(true)
  })
})
