import { describe, expect, it } from 'vitest'

import { listingChecklist } from '@/lib/listing-checklist'
import type { Business, Service, WeeklyHours } from '@/types/business'

const closed: WeeklyHours = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }

const draft = (overrides: Partial<Business> = {}): Business => ({
  id: 'biz_new',
  slug: 'kulot-studio',
  ownerId: 'usr_new',
  name: 'Kulot Studio',
  description: '',
  categoryIds: [],
  areaId: '',
  address: '',
  status: 'draft',
  bookingMethod: 'request',
  verified: false,
  featured: false,
  hours: closed,
  closures: [],
  policies: { cancellation: '', version: 0 },
  photos: [],
  createdAt: '2026-10-26T00:00:00.000Z',
  updatedAt: '2026-10-26T00:00:00.000Z',
  ...overrides,
})

const service = (active: boolean): Service => ({
  id: 'svc_1',
  businessId: 'biz_new',
  categoryId: 'sub_styling',
  name: 'Blow-dry',
  price: { type: 'fixed', amount: 300 },
  durationMinutes: 30,
  bufferMinutes: 0,
  featured: false,
  active,
  sortOrder: 0,
})

describe('listingChecklist', () => {
  it('lists everything a new listing still needs', () => {
    const checklist = listingChecklist(draft(), [])
    expect(checklist.items.map((item) => [item.step, item.done])).toEqual([
      ['details', false],
      ['hours', false],
      ['services', false],
      ['policies', false],
    ])
    expect(checklist.ready).toBe(false)
    expect(checklist.items[0]?.missing).toBe('Add a description, a category, an area and an address.')
  })

  it('needs at least one service customers can see', () => {
    expect(listingChecklist(draft(), [service(false)]).items[2]).toMatchObject({
      done: false,
      missing: 'Show at least one service to customers.',
    })
    expect(listingChecklist(draft(), [service(true)]).items[2]?.done).toBe(true)
  })

  it('is ready once every part is done', () => {
    const complete = draft({
      description: 'Curls, cuts and colour for every hair type, near Bajada.',
      categoryIds: ['cat_salon'],
      areaId: 'area_bajada',
      address: '12 J.P. Laurel Ave, Bajada, Davao City',
      hours: { ...closed, 2: [{ open: '10:00', close: '19:00' }] },
      policies: { cancellation: 'Free cancellation up to 3 hours before.', version: 1 },
    })
    const checklist = listingChecklist(complete, [service(true)])
    expect(checklist.items.every((item) => item.done)).toBe(true)
    expect(checklist.ready).toBe(true)
  })

  it('names only the missing details', () => {
    const almost = draft({ description: 'Curls, cuts and colour for every hair type.', categoryIds: ['cat_salon'] })
    expect(listingChecklist(almost, []).items[0]?.missing).toBe('Add an area and an address.')
  })
})
