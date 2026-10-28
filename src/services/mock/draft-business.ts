import type { Business, TimeRange, WeeklyHours } from '@/types/business'
import type { ID } from '@/types/common'

/** The part of the mock database a new draft touches. Kept narrow so the server can import this file. */
interface ListingStore {
  businesses: Business[]
}

/** "Lea’s Nail Bar" → "leas-nail-bar". */
export function slugify(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'shop'
  )
}

/** A slug no other listing uses: "kulot-studio", then "kulot-studio-2". */
function uniqueSlug(db: ListingStore, name: string) {
  const base = slugify(name)
  let slug = base
  for (let n = 2; db.businesses.some((business) => business.slug === slug); n++) slug = `${base}-${n}`
  return slug
}

const dayRange: TimeRange[] = [{ open: '09:00', close: '18:00' }]

/** Monday to Saturday, 9 to 6: a starting point the owner adjusts in onboarding. Shared with the server. */
export const starterHours: WeeklyHours = {
  0: [],
  1: dayRange,
  2: dayRange,
  3: dayRange,
  4: dayRange,
  5: dayRange,
  6: dayRange,
}

/**
 * The private listing a business sign-up starts with (MER-01). It stays out of search and
 * shop pages until an admin approves it; policies start at version 0 so the first saved
 * wording is version 1.
 */
export function createDraftBusiness(
  db: ListingStore,
  { id, ownerId, name, phone }: { id: ID; ownerId: ID; name: string; phone?: string },
) {
  const now = new Date().toISOString()
  const business: Business = {
    id,
    slug: uniqueSlug(db, name),
    ownerId,
    name,
    description: '',
    categoryIds: [],
    areaId: '',
    address: '',
    // The owner's sign-up number, offered as the shop's contact number in onboarding.
    phone,
    status: 'draft',
    bookingMethod: 'request',
    verified: false,
    featured: false,
    hours: structuredClone(starterHours),
    closures: [],
    policies: { cancellation: '', version: 0 },
    photos: [],
    createdAt: now,
    updatedAt: now,
  }
  db.businesses.push(business)
  return business
}
