import { describe, expect, it } from 'vitest'

import {
  dropRetiredInterests,
  exploreHrefFor,
  interestsSummary,
  liveInterestCategories,
  normaliseInterestIds,
  preferredFirst,
} from '@/lib/interests'
import { seedCategories } from '@/services/mock/seed/catalog'

describe('interest helpers', () => {
  it('lists live top-level categories in sort order', () => {
    expect(liveInterestCategories(seedCategories).map((c) => c.id)).toEqual([
      'cat_barber',
      'cat_salon',
      'cat_spa',
      'cat_nails',
      'cat_makeup',
      'cat_skin',
      'cat_brows',
      'cat_wellness',
    ])
  })
  it('normalises to catalog order without duplicates', () => {
    expect(normaliseInterestIds(['cat_nails', 'cat_barber', 'cat_nails'], seedCategories)).toEqual([
      'cat_barber',
      'cat_nails',
    ])
  })
  it.each([['sub_styling'], ['cat_gowns'], ['nope']])('refuses %s', (id) => {
    expect(normaliseInterestIds([id], seedCategories)).toBeNull()
  })
  it('drops retired ids and keeps answeredAt', () => {
    const input = { categoryIds: ['cat_barber', 'gone'], answeredAt: 'T' }
    expect(dropRetiredInterests(input, seedCategories)).toEqual({ categoryIds: ['cat_barber'], answeredAt: 'T' })
    expect(input.categoryIds).toEqual(['cat_barber', 'gone'])
  })
  it('puts preferred items first and keeps both orders', () => {
    const items = [
      { id: 'a', c: ['x'] },
      { id: 'b', c: ['y', 'z'] },
      { id: 'c', c: ['x'] },
      { id: 'd', c: ['y'] },
    ]
    expect(preferredFirst(items, new Set(['y']), (i) => i.c).map((i) => i.id)).toEqual(['b', 'd', 'a', 'c'])
    expect(preferredFirst(items, new Set(), (i) => i.c)).toEqual(items)
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd'])
  })
  it.each([
    [[], 'Showing everything'],
    [['Barber'], 'Barber first'],
    [['Salon', 'Nails'], 'Salon and Nails first'],
    [['Salon', 'Spa & Massage', 'Nails'], 'Salon, Spa & Massage and Nails first'],
  ])('summarises %j', (names, line) => expect(interestsSummary(names)).toBe(line))
  it('links Explore to the single live pick only', () => {
    expect(exploreHrefFor(['cat_barber'], seedCategories)).toBe('/explore?category=barber')
    expect(exploreHrefFor(['cat_barber', 'cat_nails'], seedCategories)).toBe('/explore')
    expect(exploreHrefFor(['gone'], seedCategories)).toBe('/explore')
    expect(exploreHrefFor([], seedCategories)).toBe('/explore')
  })
})
