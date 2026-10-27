// MOCK DATA: fictional records for the demo pages. Nothing here comes from a real system.
import type { Activity, Customer, CustomerPlan, CustomerStatus, NotificationPreferences, Profile } from '@/types/domain'

const firstNames = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ethan', 'Isla', 'Lucas', 'Aria', 'Mateo', 'Nora', 'Kai']
const lastNames = ['Santos', 'Reyes', 'Kim', 'Patel', 'Okafor', 'Novak', 'Haddad', 'Larsen', 'Mendoza', 'Tanaka']
const companies = ['Northwind', 'Acme Labs', 'Globex', 'Initech', 'Umbrella Studio', 'Hooli', 'Vandelay', 'Stark Ops']
const plans: CustomerPlan[] = ['free', 'pro', 'pro', 'enterprise']
const statuses: CustomerStatus[] = ['active', 'active', 'active', 'trialing', 'paused', 'churned']

/** Deterministic pseudo-random generator so the mock data is stable between reloads and tests. */
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T
}

function buildCustomers(count: number): Customer[] {
  const random = seeded(42)
  const baseDate = Date.UTC(2026, 9, 1)
  return Array.from({ length: count }, (_, index) => {
    const firstName = pick(firstNames, random)
    const lastName = pick(lastNames, random)
    const company = pick(companies, random)
    const plan = pick(plans, random)
    return {
      id: `cus_${String(index + 1).padStart(4, '0')}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName}.${lastName}@${company.toLowerCase().replace(/\s+/g, '')}.example`.toLowerCase(),
      company,
      plan,
      status: pick(statuses, random),
      seats: plan === 'free' ? 1 : Math.ceil(random() * (plan === 'enterprise' ? 200 : 25)),
      createdAt: new Date(baseDate - Math.floor(random() * 300) * 86_400_000).toISOString(),
    }
  })
}

export const mockCustomers: Customer[] = buildCustomers(57)

export const mockActivity: Activity[] = [
  {
    id: 'act_1',
    kind: 'signup',
    actor: 'Ava Santos',
    message: 'created a new workspace',
    occurredAt: '2026-10-20T15:42:00Z',
  },
  {
    id: 'act_2',
    kind: 'upgrade',
    actor: 'Globex',
    message: 'upgraded from Pro to Enterprise',
    occurredAt: '2026-10-20T13:05:00Z',
  },
  {
    id: 'act_3',
    kind: 'comment',
    actor: 'Liam Kim',
    message: 'commented on “Q4 onboarding checklist”',
    occurredAt: '2026-10-20T09:30:00Z',
  },
  {
    id: 'act_4',
    kind: 'invoice',
    actor: 'Northwind',
    message: 'mock invoice #1042 marked as sent',
    occurredAt: '2026-10-19T18:12:00Z',
  },
  {
    id: 'act_5',
    kind: 'alert',
    actor: 'System',
    message: 'usage on Acme Labs is above 90% of its seat limit',
    occurredAt: '2026-10-19T08:47:00Z',
  },
  {
    id: 'act_6',
    kind: 'signup',
    actor: 'Kai Novak',
    message: 'joined the Hooli workspace',
    occurredAt: '2026-10-18T16:20:00Z',
  },
]

export const defaultProfile: Profile = {
  firstName: 'Jordan',
  lastName: 'Rivera',
  email: 'jordan.rivera@example.com',
  username: 'jordan',
  bio: 'Product designer working on design systems and internal tools.',
  website: 'https://example.com',
  timezone: 'UTC',
}

export const defaultNotificationPreferences: NotificationPreferences = {
  emailDigest: 'weekly',
  productUpdates: true,
  securityAlerts: true,
  mentions: true,
  marketing: false,
}
