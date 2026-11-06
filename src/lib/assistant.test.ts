import { describe, expect, test } from 'vitest'
import {
  composeFindReply,
  composeGreeting,
  composeShopAnswer,
  composeUnknownReply,
  exploreHrefForIntent,
  parseMessage,
  type AssistantContext,
  type FindIntent,
} from '@/lib/assistant'
import { parseExploreParams } from '@/features/discovery/explore-params'
import type { Area, ServiceCategory } from '@/types/catalog'
import type { Service, ServicePrice, ShopDetails, ShopSummary } from '@/types/business'

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

const shop = (slug: string, name: string): ShopSummary => ({
  id: `biz_${slug}`,
  slug,
  name,
  categoryIds: [],
  area: { id: 'area_matina', slug: 'matina', name: 'Matina' },
  address: 'Davao City',
  verified: true,
  featured: false,
  bookingMethod: 'instant',
  hours: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  closures: [],
  serviceCount: 0,
})

const context: AssistantContext = {
  categories: [
    category('barber', 'Barber', 1),
    category('salon', 'Salon', 2),
    category('spa-massage', 'Spa & Massage', 3),
    category('nails', 'Nails', 4),
    category('facial', 'Facial', 5, 'cat_spa-massage'),
  ],
  areas: [area('matina', 'Matina'), area('lanang', 'Lanang')],
  shops: [
    shop('the-good-cut-barbershop', 'The Good Cut Barbershop'),
    shop('hair-and-flair-salon', 'Hair & Flair Salon'),
  ],
}

describe('parseMessage', () => {
  test('parses category, area, open-now and price in one message', () => {
    expect(parseMessage('cheap salons in Matina open now', context)).toEqual({
      kind: 'find',
      categorySlug: 'salon',
      areaSlug: 'matina',
      openNow: true,
      priceMax: 300,
      nearMe: undefined,
      keywords: [],
    })
  })

  test.each(['near me', 'nearby', 'close by', 'malapit'])('parses "%s" as near me', (phrase) => {
    const intent = parseMessage(`nails ${phrase}`, context)
    expect(intent).toMatchObject({ kind: 'find', categorySlug: 'nails', nearMe: true })
    expect(intent).toHaveProperty('areaSlug', undefined)
  })

  test.each([
    ['salon under 500', 500],
    ['salon under ₱500', 500],
    ['salon below 1,000', 1000],
    ['salon less than 700', 700],
    ['mura na salon', 300],
  ])('parses price in "%s"', (message, priceMax) => {
    expect(parseMessage(message, context)).toMatchObject({ kind: 'find', categorySlug: 'salon', priceMax })
  })

  test('an explicit price beats cheap', () => {
    expect(parseMessage('cheap salon under 800', context)).toMatchObject({ priceMax: 800 })
  })

  test('open as its own token means open now', () => {
    expect(parseMessage('open barber', context)).toMatchObject({ categorySlug: 'barber', openNow: true })
    expect(parseMessage('barber open today', context)).toMatchObject({ openNow: true })
  })

  test('maps synonyms to the top-level category', () => {
    expect(parseMessage('I need a haircut', context)).toMatchObject({ categorySlug: 'barber' })
    expect(parseMessage('barber shop in Lanang', context)).toMatchObject({ categorySlug: 'barber', areaSlug: 'lanang' })
    expect(parseMessage('massage please', context)).toMatchObject({ categorySlug: 'spa-massage' })
    expect(parseMessage('manicure', context)).toMatchObject({ categorySlug: 'nails' })
    expect(parseMessage('pedicure', context)).toMatchObject({ categorySlug: 'nails' })
  })

  test('a subcategory name sets the subcategory slug', () => {
    expect(parseMessage('facial in Lanang', context)).toMatchObject({ categorySlug: 'facial', areaSlug: 'lanang' })
  })

  test('ignores synonyms whose category is not in the catalog', () => {
    const noNails = { ...context, categories: context.categories.filter((c) => c.slug !== 'nails') }
    expect(parseMessage('manicure', noNails).kind).toBe('unknown')
  })

  test('leftover words become keywords', () => {
    expect(parseMessage('keratin salon in Matina', context)).toMatchObject({
      kind: 'find',
      categorySlug: 'salon',
      keywords: ['keratin'],
    })
  })

  test('shop name plus hours words is a shop question', () => {
    expect(parseMessage('what time does the good cut close?', context)).toEqual({
      kind: 'shop_question',
      shopSlug: 'the-good-cut-barbershop',
      topic: 'hours',
    })
  })

  test.each([
    ['is hair & flair salon open', 'hair-and-flair-salon', 'hours'],
    ['Hair and Flair opening hours', 'hair-and-flair-salon', 'hours'],
    ['how much is a cut at The Good Cut Barbershop', 'the-good-cut-barbershop', 'prices'],
    ['magkano sa good cut', 'the-good-cut-barbershop', 'prices'],
    ['good cut cancellation policy', 'the-good-cut-barbershop', 'policies'],
    ['does hair & flair need a deposit', 'hair-and-flair-salon', 'policies'],
    ['good cut no-show fee', 'the-good-cut-barbershop', 'policies'],
  ])('shop question: "%s"', (message, shopSlug, topic) => {
    expect(parseMessage(message, context)).toEqual({ kind: 'shop_question', shopSlug, topic })
  })

  test('a shop question wins over category, area and open-now', () => {
    expect(parseMessage('is the good cut barbershop in Matina open now', context)).toMatchObject({
      kind: 'shop_question',
      topic: 'hours',
    })
  })

  test('shop name alone is a find with the name as keywords', () => {
    expect(parseMessage('The Good Cut Barbershop', context)).toEqual({
      kind: 'find',
      categorySlug: undefined,
      areaSlug: undefined,
      openNow: undefined,
      priceMax: undefined,
      nearMe: undefined,
      keywords: ['the good cut barbershop'],
    })
  })

  test('shop name matches regardless of accents, case and apostrophes', () => {
    expect(parseMessage("HAIR & FLAIR SALON'S hours", context)).toMatchObject({ kind: 'shop_question' })
  })

  test.each(['hi', 'Hello!', 'hey', 'kumusta'])('bare greeting: "%s"', (message) => {
    expect(parseMessage(message, context)).toEqual({ kind: 'greeting' })
  })

  test('a greeting followed by a request is a find', () => {
    expect(parseMessage('hi, any nails nearby?', context)).toMatchObject({
      kind: 'find',
      categorySlug: 'nails',
      nearMe: true,
    })
  })

  test('unparseable message is unknown', () => {
    expect(parseMessage('something for my wedding next month', context).kind).toBe('unknown')
    expect(parseMessage('', context).kind).toBe('unknown')
  })
})

const find = (overrides: Partial<FindIntent> = {}): FindIntent => ({ kind: 'find', keywords: [], ...overrides })

const hoursNone = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
const nineToNine = { open: '09:00', close: '21:00' } as const
const openDaily = {
  0: [nineToNine],
  1: [nineToNine],
  2: [nineToNine],
  3: [nineToNine],
  4: [nineToNine],
  5: [nineToNine],
  6: [nineToNine],
}

const service = (name: string, price: ServicePrice): Service => ({
  id: `svc_${name}`,
  businessId: 'biz_x',
  categoryId: 'cat_salon',
  name,
  price,
  durationMinutes: 30,
  bufferMinutes: 0,
  featured: false,
  active: true,
  sortOrder: 1,
})

const details = (overrides: Partial<ShopDetails> = {}): ShopDetails => ({
  id: 'biz_x',
  slug: 'hair-and-flair-salon',
  name: 'Hair & Flair Salon',
  description: '',
  categoryIds: [],
  area: { id: 'area_matina', slug: 'matina', name: 'Matina' },
  address: 'Davao City',
  bookingMethod: 'instant',
  verified: true,
  featured: false,
  hours: openDaily,
  closures: [],
  policies: { cancellation: 'Cancel up to 24 hours before.', version: 1 },
  photos: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  serviceCount: 0,
  ...overrides,
})

// Friday 6 Nov 2026, 12:00 in Davao (UTC+8).
const noon = new Date('2026-11-06T04:00:00Z')

describe('exploreHrefForIntent', () => {
  test('round-trips through parseExploreParams', () => {
    const intent = find({
      categorySlug: 'salon',
      areaSlug: 'matina',
      openNow: true,
      priceMax: 500,
      keywords: ['hair', 'wash'],
    })
    const href = exploreHrefForIntent(intent)
    expect(href.startsWith('/explore?')).toBe(true)
    expect(parseExploreParams(new URLSearchParams(href.split('?')[1]))).toEqual({
      q: 'hair wash',
      category: 'salon',
      area: 'matina',
      priceMax: 500,
      openNow: true,
      sort: undefined,
      page: undefined,
    })
  })

  test('near me adds nothing and an empty intent is plain /explore', () => {
    expect(exploreHrefForIntent(find({ nearMe: true }))).toBe('/explore')
  })
})

describe('composeFindReply', () => {
  const results = ['a', 'b', 'c', 'd'].map((slug) => ({ shop: shop(slug, `Shop ${slug}`) }))

  test('caps shops at 3, sets exploreHref and states the honest count and scope', () => {
    const reply = composeFindReply(find({ categorySlug: 'salon', areaSlug: 'matina', openNow: true }), results, 4)
    expect(reply.shops).toHaveLength(3)
    expect(reply.exploreHref).toBe('/explore?category=salon&area=matina&open=1')
    expect(reply.text).toContain('4')
    expect(reply.text).toContain('Matina')
    expect(reply.text).toMatch(/open right now/i)
    expect(reply.text).not.toMatch(/best|top/i)
  })

  test('says so when more shops exist than are shown', () => {
    expect(composeFindReply(find({ categorySlug: 'salon' }), results.slice(0, 3), 9).text).toMatch(/showing 3/i)
  })

  test('zero results: no cards, no link, names what was asked and suggests loosening', () => {
    const reply = composeFindReply(find({ categorySlug: 'nails', areaSlug: 'lanang', openNow: true }), [], 0)
    expect(reply.shops).toEqual([])
    expect(reply.exploreHref).toBeUndefined()
    expect(reply.text).toContain('nails')
    expect(reply.text).toContain('Lanang')
    expect(reply.text).not.toMatch(/try again later/i)
    expect(reply.suggestions.length).toBeGreaterThan(0)
  })

  test('a price shown comes from the first result service', () => {
    const withService = [{ shop: shop('a', 'Shop a'), service: service('Haircut', { type: 'from', amount: 250 }) }]
    const reply = composeFindReply(find({ categorySlug: 'salon' }), withService, 1)
    expect(reply.text).toContain('₱250')
    expect(reply.text).toMatch(/estimate/i)
    expect(composeFindReply(find({ categorySlug: 'salon' }), [{ shop: shop('a', 'Shop a') }], 1).text).not.toContain(
      '₱',
    )
  })
})

describe('composeShopAnswer', () => {
  test("hours: live status plus today's hours", () => {
    const reply = composeShopAnswer('hours', details(), [], noon)
    expect(reply.text).toMatch(/is open right now/)
    expect(reply.text).toContain('9:00 PM')
    expect(reply.text).toContain('Friday')
    expect(reply.shops).toHaveLength(1)
  })

  test('hours: a shop with no hours says not provided', () => {
    const reply = composeShopAnswer('hours', details({ hours: hoursNone }), [], noon)
    expect(reply.text).toContain('Opening hours not provided')
  })

  test('prices: up to 5 services, with estimates flagged', () => {
    const services = [
      service('Haircut', { type: 'fixed', amount: 200 }),
      service('Color', { type: 'from', amount: 1200 }),
      service('Rebond', { type: 'range', amount: 2000, maxAmount: 3500 }),
      service('Treatment', { type: 'quote' }),
      service('Fifth', { type: 'fixed', amount: 99 }),
      service('Sixth', { type: 'fixed', amount: 98 }),
    ]
    const reply = composeShopAnswer('prices', details(), services, noon)
    expect(reply.text).toContain('₱200')
    expect(reply.text).toContain('₱1,200')
    expect(reply.text).toContain('₱3,500')
    expect(reply.text).toContain('Fifth')
    expect(reply.text).not.toContain('Sixth')
    expect(reply.text).toMatch(/estimate/i)
    expect(reply.text).toContain('Estimates are confirmed by the shop when you book.')
    expect(reply.text).not.toContain('marked as estimates')
  })

  test('prices: a quote price reads "price on consultation" and never a number', () => {
    const reply = composeShopAnswer('prices', details(), [service('Treatment', { type: 'quote' })], noon)
    expect(reply.text).toContain('price on consultation')
    expect(reply.text).not.toMatch(/\d/)
    expect(reply.text).not.toMatch(/estimate/i)
  })

  test('prices: no services is said plainly', () => {
    expect(composeShopAnswer('prices', details(), [], noon).text).toMatch(/no services/i)
  })

  test("policies: returns the shop's own text and labels the missing ones", () => {
    const text = composeShopAnswer('policies', details(), [], noon).text
    expect(text).toContain('Cancel up to 24 hours before.')
    expect(text).toMatch(/no-show.*not provided/i)
    expect(text).toMatch(/deposit.*not provided/i)
  })
})

describe('suggestion chips round-trip through parseMessage', () => {
  const greetingChips = context.categories.map((c) => `Find a ${c.name} near me`)
  const areaChips = context.areas.map((a) => `Shops in ${a.name}`)
  const intents: FindIntent[] = [
    find({ categorySlug: 'barber', areaSlug: 'matina', openNow: true }),
    find({ categorySlug: 'spa-massage', areaSlug: 'lanang', priceMax: 300, openNow: true }),
    find({ areaSlug: 'matina', openNow: true }),
    find({ categorySlug: 'nails', areaSlug: 'lanang' }),
    find({ areaSlug: 'lanang' }),
  ]
  const looseningChips = intents.flatMap((intent) => composeFindReply(intent, [], 0).suggestions)

  test('every chip the code can emit parses to a find with no junk keywords', () => {
    const chips = [...greetingChips, ...areaChips, 'Show me shops near me', ...looseningChips]
    expect(looseningChips.length).toBeGreaterThan(0)
    for (const chip of chips) {
      const intent = parseMessage(chip, context)
      expect(intent.kind, chip).toBe('find')
      if (intent.kind === 'find') expect(intent.keywords, chip).toEqual([])
    }
  })

  test('the area chip filters by that area', () => {
    expect(parseMessage('Shops in Matina', context)).toMatchObject({ kind: 'find', areaSlug: 'matina' })
  })
})

describe('composeUnknownReply and composeGreeting', () => {
  test('carry the suggestions and no shops', () => {
    for (const reply of [composeUnknownReply(['Salons in Matina']), composeGreeting(['Salons in Matina'])]) {
      expect(reply.suggestions).toEqual(['Salons in Matina'])
      expect(reply.shops).toEqual([])
      expect(reply.exploreHref).toBeUndefined()
      expect(reply.text.length).toBeGreaterThan(0)
    }
  })
})
