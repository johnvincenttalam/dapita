import { createSeedBookings } from '@/services/mock/seed/bookings'
import { createSeedConversations } from '@/services/mock/seed/conversations'
import { createSeedBusinesses, createSeedServices, createSeedStaff } from '@/services/mock/seed/businesses'
import { seedAreas, seedCategories } from '@/services/mock/seed/catalog'
import { toDateKey } from '@/lib/datetime'
import type { Business, Service, StaffMember } from '@/types/business'
import type { Booking, BookingEvent } from '@/types/booking'
import type { Area, ServiceCategory } from '@/types/catalog'
import type { ID, ISODateTime } from '@/types/common'
import type { ModerationAction, SupportCase } from '@/types/admin'
import type { Conversation, ConversationReport, Message } from '@/types/message'
import type { MerchantNotificationSettings } from '@/types/settings'

// MOCK: an in-browser "database" persisted to localStorage so a demo survives
// reloads and can round-trip customer → merchant → customer (plan §6). Only the
// mock services read or write it. Bump MOCK_DB_VERSION when the shape or the seed
// content changes (e.g. new photos), so existing demos reseed and pick it up.

export const MOCK_DB_KEY = 'glamspot-mock-db'
const MOCK_DB_VERSION = 18

export interface MockDb {
  version: number
  seededAt: ISODateTime
  areas: Area[]
  categories: ServiceCategory[]
  businesses: Business[]
  services: Service[]
  staff: StaffMember[]
  bookings: Booking[]
  bookingEvents: BookingEvent[]
  /** Idempotency key → booking id, so a retried submit doesn't create a duplicate (doc §11.1). */
  idempotencyKeys: Record<string, ID>
  conversations: Conversation[]
  messages: Message[]
  conversationReports: ConversationReport[]
  moderationActions: ModerationAction[]
  supportCases: SupportCase[]
  /** `${businessId}:${userId}` → email choices. Optional so demos saved before it keep working. */
  merchantNotificationSettings?: Record<string, MerchantNotificationSettings>
}

export function createSeedDb(now: Date = new Date()): MockDb {
  const businesses = createSeedBusinesses(toDateKey(now))
  const services = createSeedServices()
  const { bookings, events } = createSeedBookings(now, businesses, services)
  const { conversations, messages, reports, cases } = createSeedConversations(now, businesses)
  return {
    version: MOCK_DB_VERSION,
    seededAt: now.toISOString(),
    areas: structuredClone(seedAreas),
    categories: structuredClone(seedCategories),
    businesses,
    services,
    staff: createSeedStaff(),
    bookings,
    bookingEvents: events,
    idempotencyKeys: {},
    conversations,
    messages,
    conversationReports: reports,
    moderationActions: [],
    supportCases: cases,
  }
}

// Fallback when localStorage is unavailable (private mode, blocked storage).
let memoryDb: MockDb | null = null

function load(): MockDb | null {
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MockDb
    return parsed.version === MOCK_DB_VERSION ? parsed : null
  } catch {
    return memoryDb && structuredClone(memoryDb)
  }
}

function save(db: MockDb) {
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db))
  } catch {
    memoryDb = db
  }
}

/** A snapshot of the mock database, seeded on first use. Mutating it has no effect; use `updateMockDb`. */
export function readMockDb(): MockDb {
  const existing = load()
  if (existing) return existing
  const seeded = createSeedDb()
  save(seeded)
  return structuredClone(seeded)
}

/** Applies `change` to the stored database and returns its result. */
export function updateMockDb<T>(change: (db: MockDb) => T): T {
  const db = readMockDb()
  const result = change(db)
  save(db)
  return result
}

/** Discards every change made in the demo and reseeds relative to now. */
export function resetMockDb() {
  memoryDb = null
  try {
    localStorage.removeItem(MOCK_DB_KEY)
  } catch {
    // Nothing stored.
  }
}
