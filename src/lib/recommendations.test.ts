import { describe, expect, it } from 'vitest'

import {
  rankNearby,
  recommendationTag,
  recommendShops,
  type RecommendInput,
  type ScoredShop,
} from '@/lib/recommendations'
import type { BookingStatus } from '@/types/booking'
import type { ShopSummary } from '@/types/business'
import type { Recommendation } from '@/types/recommendation'

const now = new Date('2026-10-29T00:00:00Z')
const daysFromNow = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString()

const shops: RecommendInput['shops'] = [
  { id: 's1', name: 'Alpha Cuts', categoryIds: ['cat_barber'] },
  { id: 's2', name: 'Bravo Salon', categoryIds: ['cat_salon'] },
  { id: 's3', name: 'Charlie Spa', categoryIds: ['cat_spa'] },
  { id: 's4', name: 'Delta Barbers', categoryIds: ['cat_barber'] },
  { id: 's5', name: 'Echo Nails', categoryIds: ['cat_nails'] },
  { id: 's6', name: 'Foxtrot Fades', categoryIds: ['cat_barber', 'cat_salon'] },
]

const save = (userId: string, businessId: string) => ({ userId, businessId })
const book = (customerId: string, businessId: string, status: BookingStatus = 'confirmed', days = 1) => ({
  customerId,
  businessId,
  status,
  start: daysFromNow(days),
})

function score(input: Partial<RecommendInput>): ScoredShop[] {
  return recommendShops({
    viewer: { id: 'v', memberBusinessIds: [] },
    bookings: [],
    favorites: [],
    withdrawnUserIds: new Set(),
    shops,
    now,
    ...input,
  })
}

const byId = (result: ScoredShop[]) => new Map(result.map((entry) => [entry.businessId, entry]))

describe('recommendShops', () => {
  it('gives "similar_customers" only when 3 neighbours used the shop', () => {
    const result = byId(
      score({
        favorites: [
          save('v', 's1'),
          ...['a', 'b', 'c'].flatMap((user) => [save(user, 's1'), save(user, 's2')]),
          save('d', 's1'),
          save('d', 's3'),
        ],
      }),
    )
    expect(result.get('s2')?.reason).toBe('similar_customers')
    expect(result.get('s3')?.reason).not.toBe('similar_customers')
  })

  it('counts confirmed and completed bookings as use, not pending or cancelled', () => {
    const result = byId(
      score({
        favorites: [save('v', 's1')],
        bookings: [
          book('a', 's1', 'confirmed'),
          book('a', 's2', 'completed', -5),
          book('b', 's1', 'completed', -5),
          book('b', 's2', 'confirmed'),
          // c is only linked to the viewer through a pending request, so c isn't a neighbour.
          book('c', 's1', 'pending'),
          book('c', 's2', 'confirmed'),
        ],
      }),
    )
    expect(result.get('s2')?.reason).not.toBe('similar_customers')

    const withThird = byId(
      score({
        favorites: [save('v', 's1')],
        bookings: [
          book('a', 's1'),
          book('a', 's2'),
          book('b', 's1'),
          book('b', 's2'),
          book('c', 's1', 'completed', -5),
          book('c', 's2'),
        ],
      }),
    )
    expect(withThird.get('s2')?.reason).toBe('similar_customers')
  })

  it('excludes shops with any non-draft booking', () => {
    const result = byId(
      score({
        bookings: [book('v', 's4', 'pending'), book('v', 's5', 'cancelled'), book('v', 's6', 'draft')],
      }),
    )
    expect(result.has('s4')).toBe(false)
    expect(result.has('s5')).toBe(false)
    expect(result.has('s6')).toBe(true)
  })

  it('excludes saved shops and the viewer’s own business', () => {
    const result = byId(score({ viewer: { id: 'v', memberBusinessIds: ['s2'] }, favorites: [save('v', 's1')] }))
    expect(result.has('s1')).toBe(false)
    expect(result.has('s2')).toBe(false)
    expect(result.size).toBe(shops.length - 2)
  })

  it('ranks popular_in_category by recent bookings, counting upcoming ones', () => {
    const result = score({
      // The viewer uses a barber, so barber shops are "their category".
      favorites: [save('v', 's1')],
      bookings: [
        book('x', 's4', 'confirmed', 30),
        book('y', 's6', 'completed', -10),
        book('z', 's6', 'confirmed', 2),
        // Too old to count.
        book('x', 's3', 'completed', -91),
      ],
    })
    const entries = byId(result)
    expect(entries.get('s6')).toMatchObject({ reason: 'popular_in_category', categoryId: 'cat_barber' })
    expect(entries.get('s4')).toMatchObject({ reason: 'popular_in_category', categoryId: 'cat_barber' })
    expect(entries.get('s3')?.reason).toBe('none')
    expect(result.map((entry) => entry.businessId).slice(0, 2)).toEqual(['s6', 's4'])
  })

  it('breaks popularity ties by saves, then name', () => {
    const result = score({
      viewer: undefined,
      bookings: [book('x', 's2'), book('x', 's3'), book('x', 's5')],
      favorites: [save('y', 's5')],
    })
    expect(result.map((entry) => entry.businessId).slice(0, 3)).toEqual(['s5', 's2', 's3'])
  })

  it('gives "popular" without viewer history and "none" without recent bookings', () => {
    const entries = byId(score({ viewer: undefined, bookings: [book('x', 's2')] }))
    expect(entries.get('s2')?.reason).toBe('popular')
    expect(entries.get('s1')).toMatchObject({ reason: 'none', fit: 0 })
  })

  it('orders reasons by fit bands', () => {
    const result = score({
      favorites: [save('v', 's1'), ...['a', 'b', 'c'].flatMap((user) => [save(user, 's1'), save(user, 's2')])],
      bookings: [book('x', 's4'), book('x', 's4', 'completed', -3), book('x', 's3'), book('x', 's3'), book('y', 's3')],
    })
    const fits = (reason: ScoredShop['reason']) =>
      result.filter((entry) => entry.reason === reason).map((entry) => entry.fit)
    expect(fits('similar_customers').length).toBeGreaterThan(0)
    expect(fits('popular_in_category').length).toBeGreaterThan(0)
    expect(fits('popular').length).toBeGreaterThan(0)
    expect(Math.min(...fits('similar_customers'))).toBeGreaterThan(Math.max(...fits('popular_in_category')))
    expect(Math.min(...fits('popular_in_category'))).toBeGreaterThan(Math.max(...fits('popular')))
    expect(Math.min(...fits('popular'))).toBeGreaterThan(0)
    expect(fits('none').every((fit) => fit === 0)).toBe(true)
  })

  it('ignores withdrawn users’ activity', () => {
    const input: Partial<RecommendInput> = {
      favorites: [save('v', 's1'), ...['a', 'b', 'c'].flatMap((user) => [save(user, 's1'), save(user, 's2')])],
    }
    expect(byId(score(input)).get('s2')?.reason).toBe('similar_customers')
    expect(byId(score({ ...input, withdrawnUserIds: new Set(['c']) })).get('s2')?.reason).not.toBe('similar_customers')
  })
})

const origin = { lat: 7.07, lng: 125.6 }
/** A shop `km` north of the origin (1° of latitude ≈ 111.2 km). */
function entry(id: string, km: number | null, fit = 0, reason: Recommendation['reason'] = 'none'): Recommendation {
  const shop = {
    id,
    name: `Shop ${id}`,
    coordinates: km === null ? undefined : { lat: origin.lat + km / 111.195, lng: origin.lng },
  } as ShopSummary
  return { shop, fit, reason }
}
const ids = (ranked: Recommendation[]) => ranked.map((item) => item.shop.id)

describe('rankNearby', () => {
  it('keeps shops within 5 km when at least 3 are there', () => {
    const ranked = rankNearby([entry('a', 1), entry('b', 2), entry('c', 4.5), entry('d', 6)], origin)
    expect(ids(ranked)).toEqual(['a', 'b', 'c'])
    expect(ranked[0]?.distanceKm).toBeCloseTo(1, 1)
  })

  it('widens to 10 km, then 20 km, then the whole city', () => {
    expect(ids(rankNearby([entry('a', 1), entry('b', 8), entry('c', 9), entry('d', 15)], origin))).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(ids(rankNearby([entry('a', 1), entry('b', 12), entry('c', 18), entry('d', 30)], origin))).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(ids(rankNearby([entry('a', 1), entry('b', 25), entry('c', 30)], origin))).toEqual(['a', 'b', 'c'])
  })

  it('places shops without coordinates only in the whole-city step', () => {
    expect(ids(rankNearby([entry('a', 1), entry('b', 2), entry('c', 3), entry('x', null, 1)], origin))).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(ids(rankNearby([entry('a', 1), entry('b', 40), entry('x', null)], origin))).toEqual(['a', 'b', 'x'])
  })

  it('with fit 0 everywhere, orders by distance', () => {
    expect(ids(rankNearby([entry('c', 3), entry('a', 0.5), entry('b', 2)], origin))).toEqual(['a', 'b', 'c'])
  })

  it('a strong fit beats a slightly nearer weak fit', () => {
    const ranked = rankNearby([entry('near', 0.5), entry('fit', 4, 1, 'similar_customers'), entry('mid', 2)], origin)
    expect(ids(ranked)[0]).toBe('fit')
  })

  it('without a position, orders by fit and sets no distance', () => {
    const ranked = rankNearby([entry('a', 1, 0.2, 'popular'), entry('b', 2, 0.9, 'similar_customers')])
    expect(ids(ranked)).toEqual(['b', 'a'])
    expect(ranked.every((item) => item.distanceKm === undefined)).toBe(true)
  })

  it('caps at 8', () => {
    const many = Array.from({ length: 12 }, (_, index) => entry(`s${index}`, index * 0.3))
    expect(rankNearby(many, origin)).toHaveLength(8)
    expect(rankNearby(many)).toHaveLength(8)
  })
})

describe('recommendationTag', () => {
  it('says why a shop is suggested near you', () => {
    expect(recommendationTag(entry('a', 1, 0.9, 'similar_customers'), undefined, true)).toBe('Customers like you')
    expect(recommendationTag(entry('a', 1, 0.5, 'popular_in_category'), 'Barber', true)).toBe('Popular in Barber')
    expect(recommendationTag(entry('a', 1, 0.2, 'popular'), undefined, true)).toBe('Popular near you')
    expect(recommendationTag(entry('a', 1, 0, 'none'), undefined, true)).toBe('Nearest')
  })

  it('drops the distance wording without a position', () => {
    expect(recommendationTag(entry('a', 1, 0.9, 'similar_customers'))).toBe('Customers like you')
    expect(recommendationTag(entry('a', 1, 0.5, 'popular_in_category'), 'Barber')).toBe('Popular in Barber')
    expect(recommendationTag(entry('a', 1, 0.2, 'popular'))).toBe('Popular')
    expect(recommendationTag(entry('a', 1, 0, 'none'))).toBeUndefined()
  })
})
