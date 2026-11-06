import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import type { AssistantContext } from '@/lib/assistant'
import type { Area, ServiceCategory } from '@/types/catalog'
import type { Service, ServicePrice, ShopDetails, ShopSummary } from '@/types/business'
import type { ShopSearchParams } from '@/services/shops.service'
import { createRuleEngine, fetchAllShops, type EngineDeps } from './engine'

const searchShops = vi.hoisted(() => vi.fn())

vi.mock('@/services/shops.service', () => ({
  shopsService: {
    searchShops: (params: unknown) => searchShops(params) as Promise<unknown>,
    getShop: vi.fn(),
    getShopServices: vi.fn(),
  },
}))
vi.mock('@/services/catalog.service', () => ({
  catalogService: { getCategories: vi.fn(), getAreas: vi.fn() },
}))

const category = (slug: string, name: string, sortOrder: number, parentId?: string): ServiceCategory => ({
  id: `cat_${slug}`,
  slug,
  name,
  parentId,
  icon: 'generic',
  status: 'active',
  sortOrder,
})

const area = (slug: string, name: string): Area => ({
  id: `area_${slug}`,
  slug,
  name,
  center: { lat: 7.1, lng: 125.6 },
})

const shop = (slug: string, name: string, coordinates?: { lat: number; lng: number }): ShopSummary => ({
  id: `biz_${slug}`,
  slug,
  name,
  categoryIds: [],
  area: { id: 'area_matina', slug: 'matina', name: 'Matina' },
  address: 'Davao City',
  coordinates,
  verified: true,
  featured: false,
  bookingMethod: 'instant',
  hours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  closures: [],
  serviceCount: 0,
})

const service = (id: string, categorySlug: string, price: ServicePrice, active = true): Service => ({
  id,
  businessId: 'x',
  categoryId: `cat_${categorySlug}`,
  name: `Service ${id}`,
  price,
  durationMinutes: 30,
  bufferMinutes: 0,
  featured: false,
  active,
  sortOrder: 0,
})

const categories = [
  category('barber', 'Barber', 1),
  category('salon', 'Salon', 2),
  category('spa-massage', 'Spa & Massage', 3),
  category('nails', 'Nails', 4),
  category('facial', 'Facial', 5, 'cat_spa-massage'),
]

const far = shop('far-salon', 'Far Salon', { lat: 7.3, lng: 125.6 })
const mid = shop('mid-salon', 'Mid Salon', { lat: 7.1, lng: 125.61 })
const trap = shop('trap-salon', 'Trap Salon', { lat: 7.1, lng: 125.6 })
const nowhere = shop('nowhere-salon', 'Nowhere Salon')
const goodCut = shop('the-good-cut-barbershop', 'The Good Cut Barbershop', { lat: 7.12, lng: 125.6 })

const context: AssistantContext = {
  categories,
  areas: [area('matina', 'Matina'), area('lanang', 'Lanang'), area('buhangin', 'Buhangin'), area('toril', 'Toril')],
  shops: [far, mid, trap, nowhere, goodCut],
}

const servicesBySlug: Record<string, Service[]> = {
  'far-salon': [service('f1', 'salon', { type: 'fixed', amount: 250 })],
  'mid-salon': [service('n1', 'salon', { type: 'fixed', amount: 900 }), service('n2', 'salon', { type: 'quote' })],
  // Cheap, but in the wrong category.
  'trap-salon': [service('t1', 'barber', { type: 'fixed', amount: 100 })],
  'nowhere-salon': [service('w1', 'salon', { type: 'from', amount: 200 })],
  'the-good-cut-barbershop': [service('g1', 'barber', { type: 'fixed', amount: 150 })],
}

function makeDeps(overrides: Partial<EngineDeps> = {}): EngineDeps {
  return {
    getContext: () => Promise.resolve(context),
    getShop: (slug) =>
      slug !== goodCut.slug
        ? Promise.reject(new ApiError('gone', 404))
        : Promise.resolve({
            ...goodCut,
            photos: [],
            policies: { cancellation: '24 hours notice' },
            closures: [],
          } as unknown as ShopDetails),
    getShopServices: (slug) => Promise.resolve(servicesBySlug[slug] ?? []),
    getPosition: () => undefined,
    getInterestCategoryIds: () => [],
    ...overrides,
  }
}

const shopsFor = (items: ShopSummary[]) => ({ items, total: items.length, page: 1, pageSize: 50 })

beforeEach(() => {
  searchShops.mockReset()
  searchShops.mockResolvedValue(shopsFor([far, mid, trap, nowhere]))
})

describe('find', () => {
  test('near me without a position asks instead of searching', async () => {
    const reply = await createRuleEngine(makeDeps()).reply('salon near me')
    expect(searchShops).not.toHaveBeenCalled()
    expect(reply.shops).toEqual([])
    expect(reply.text).toMatch(/location|area/i)
    expect(reply.suggestions.length).toBeGreaterThanOrEqual(2)
    expect(reply.suggestions.length).toBeLessThanOrEqual(3)
    expect(reply.suggestions.every((s) => context.areas.some((a) => s.includes(a.name)))).toBe(true)
  })

  test('searches with params from the intent and never sends coordinates', async () => {
    const position = { lat: 7.1, lng: 125.6 }
    await createRuleEngine(makeDeps({ getPosition: () => position })).reply('keratin salon in Matina open now')
    expect(searchShops).toHaveBeenCalledWith({
      q: 'keratin',
      category: 'salon',
      area: 'matina',
      openNow: true,
      pageSize: 50,
    })
    expect(JSON.stringify(searchShops.mock.calls)).not.toContain('125.6')
  })

  test('ranks by distance when a position exists, shops without coordinates last', async () => {
    const reply = await createRuleEngine(makeDeps({ getPosition: () => ({ lat: 7.1, lng: 125.6 }) })).reply(
      'salon near me',
    )
    expect(reply.shops.map((r) => r.shop.slug)).toEqual(['trap-salon', 'mid-salon', 'far-salon'])
    expect(reply.shops[0]?.distanceKm).toBeCloseTo(0, 1)
    expect(reply.shops[1]?.distanceKm).toBeGreaterThan(0)
    expect(reply.shops.every((r) => r.distanceKm !== undefined)).toBe(true)
  })

  test('shops without coordinates rank last and carry no distance', async () => {
    searchShops.mockResolvedValue(shopsFor([nowhere, far]))
    const reply = await createRuleEngine(makeDeps({ getPosition: () => ({ lat: 7.1, lng: 125.6 }) })).reply('salons')
    expect(reply.shops.map((r) => r.shop.slug)).toEqual(['far-salon', 'nowhere-salon'])
    expect(reply.shops[1]?.distanceKm).toBeUndefined()
  })

  test('without a position keeps search order and carries no distance', async () => {
    const reply = await createRuleEngine(makeDeps()).reply('salons in Matina')
    expect(reply.shops.map((r) => r.shop.slug)).toEqual(['far-salon', 'mid-salon', 'trap-salon'])
    expect(reply.shops.every((r) => r.distanceKm === undefined)).toBe(true)
  })

  test('category plus price cap drops the shop whose cheap service is in the wrong category', async () => {
    const reply = await createRuleEngine(makeDeps()).reply('salon under 500')
    const slugs = reply.shops.map((r) => r.shop.slug)
    expect(slugs).not.toContain('trap-salon')
    expect(slugs).not.toContain('mid-salon') // 900 is over the cap, quote never matches
    expect(slugs).toContain('far-salon')
    expect(reply.shops.find((r) => r.shop.slug === 'far-salon')?.service?.id).toBe('f1')
    expect(reply.text).toContain('Service f1')
  })

  test('a from price at or under the cap matches; inactive services do not', async () => {
    const inactive: Record<string, Service[]> = {
      ...servicesBySlug,
      'far-salon': [service('f1', 'salon', { type: 'fixed', amount: 250 }, false)],
    }
    const reply = await createRuleEngine(
      makeDeps({ getShopServices: (slug) => Promise.resolve(inactive[slug] ?? []) }),
    ).reply('salon under 500')
    expect(reply.shops.map((r) => r.shop.slug)).toEqual(['nowhere-salon'])
  })

  test('services of a subcategory count for the top-level category', async () => {
    const withFacial: Record<string, Service[]> = {
      'far-salon': [service('f2', 'facial', { type: 'fixed', amount: 400 })],
    }
    searchShops.mockResolvedValue(shopsFor([far]))
    const reply = await createRuleEngine(
      makeDeps({ getShopServices: (slug) => Promise.resolve(withFacial[slug] ?? []) }),
    ).reply('massage under 500')
    expect(reply.shops[0]?.service?.id).toBe('f2')
  })

  test('only the first six ranked shops have their services fetched', async () => {
    const many = Array.from({ length: 9 }, (_, i) => shop(`s${i}`, `Shop ${i}`))
    searchShops.mockResolvedValue(shopsFor(many))
    const getShopServices = vi.fn((_slug: string) =>
      Promise.resolve([service('x', 'salon', { type: 'fixed', amount: 100 })]),
    )
    await createRuleEngine(makeDeps({ getShopServices })).reply('salon under 500')
    expect(getShopServices).toHaveBeenCalledTimes(6)
  })

  test('a subcategory attaches its matching service without a price cap', async () => {
    const withFacial: Record<string, Service[]> = {
      'far-salon': [service('f2', 'facial', { type: 'fixed', amount: 400 })],
    }
    searchShops.mockResolvedValue(shopsFor([far]))
    const reply = await createRuleEngine(
      makeDeps({ getShopServices: (slug) => Promise.resolve(withFacial[slug] ?? []) }),
    ).reply('facial in Matina')
    expect(reply.shops[0]?.service?.id).toBe('f2')
  })

  test('no category plus price means no per-shop service fetch', async () => {
    const getShopServices = vi.fn((_slug: string) => Promise.resolve([] as Service[]))
    await createRuleEngine(makeDeps({ getShopServices })).reply('salons in Matina')
    expect(getShopServices).not.toHaveBeenCalled()
  })
})

describe('shop questions', () => {
  test('answers from the shop and its services', async () => {
    const reply = await createRuleEngine(makeDeps()).reply('good cut cancellation policy')
    expect(reply.text).toContain('24 hours notice')
    expect(reply.shops[0]?.shop.slug).toBe('the-good-cut-barbershop')
  })

  test('an unknown shop gives an honest not-found reply offering search', async () => {
    const deps = makeDeps({
      getShop: () => Promise.reject(new ApiError('gone', 404)),
    })
    const reply = await createRuleEngine(deps).reply('good cut cancellation policy')
    expect(reply.shops).toEqual([])
    expect(reply.text).toMatch(/couldn't find/i)
    expect(reply.text).toMatch(/search/i)
    expect(reply.suggestions.length).toBeGreaterThan(0)
  })
})

describe('greeting and unknown', () => {
  test('guests get the first three live categories', async () => {
    const reply = await createRuleEngine(makeDeps()).greeting()
    expect(reply.suggestions).toEqual(['Find a Barber near me', 'Find a Salon near me', 'Find a Spa & Massage near me'])
  })

  test('interested customers get their own categories', async () => {
    const reply = await createRuleEngine(
      makeDeps({ getInterestCategoryIds: () => ['cat_nails', 'cat_salon'] }),
    ).greeting()
    expect(reply.suggestions).toEqual(['Find a Salon near me', 'Find a Nails near me'])
  })

  test('a typed hello and gibberish go through the same composers', async () => {
    const engine = createRuleEngine(makeDeps())
    expect((await engine.reply('hello')).text).toMatch(/^Hi!/)
    const unknown = await engine.reply('qwerty zzz')
    expect(unknown.text).toMatch(/not sure/i)
    expect(unknown.suggestions.length).toBeGreaterThan(0)
  })
})

describe('errors', () => {
  test('a rejecting dependency yields an error reply, not a rejection', async () => {
    const deps = makeDeps({
      getContext: () => Promise.reject(new Error('boom')),
    })
    const reply = await createRuleEngine(deps).reply('salon')
    expect(reply.text).toMatch(/went wrong/i)
    expect(reply.text).toMatch(/try again/i)
    expect(reply.shops).toEqual([])
  })

  test('a failing search is also an error reply', async () => {
    searchShops.mockRejectedValue(new Error('down'))
    const reply = await createRuleEngine(makeDeps()).reply('salon')
    expect(reply.text).toMatch(/went wrong/i)
  })

  test('a non-404 getShop failure is an error reply, not "not found"', async () => {
    const reply = await createRuleEngine(
      makeDeps({
        getShop: () => Promise.reject(new Error('network')),
      }),
    ).reply('good cut cancellation policy')
    expect(reply.text).toMatch(/went wrong/i)
  })
})

describe('fetchAllShops', () => {
  test('pages until total is reached', async () => {
    const pageOf = (n: number) => Array.from({ length: n === 3 ? 20 : 50 }, (_, i) => shop(`p${n}-${i}`, `P${n} ${i}`))
    searchShops.mockImplementation(({ page }: ShopSearchParams) =>
      Promise.resolve({
        items: pageOf(page ?? 1),
        total: 120,
        page,
        pageSize: 50,
      }),
    )
    const all = await fetchAllShops()
    expect(all).toHaveLength(120)
    expect(searchShops.mock.calls.map((call) => call[0] as unknown)).toEqual([
      { page: 1, pageSize: 50 },
      { page: 2, pageSize: 50 },
      { page: 3, pageSize: 50 },
    ])
  })

  test('stops at ten pages even if the server keeps claiming more', async () => {
    searchShops.mockResolvedValue({ items: [shop('a', 'A')], total: 9999, page: 1, pageSize: 50 })
    await fetchAllShops()
    expect(searchShops).toHaveBeenCalledTimes(10)
  })

  test('stops on an empty page', async () => {
    searchShops.mockResolvedValue({ items: [], total: 5, page: 1, pageSize: 50 })
    expect(await fetchAllShops()).toEqual([])
    expect(searchShops).toHaveBeenCalledTimes(1)
  })
})
