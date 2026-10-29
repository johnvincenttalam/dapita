import { describe, expect, it } from 'vitest'

import { recommendShops, type RecommendInput, type ScoredShop } from '@/lib/recommendations'
import type { BookingStatus } from '@/types/booking'

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
