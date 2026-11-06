import { describe, expect, test } from 'vitest'
import { parseMessage, type AssistantContext } from '@/lib/assistant'
import type { Area, ServiceCategory } from '@/types/catalog'
import type { ShopSummary } from '@/types/business'

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
