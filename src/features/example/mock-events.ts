// MOCK DATA for the search & filter demo. Fictional events; nothing is bookable.

export type EventCategory = 'design' | 'engineering' | 'product'
export type EventFormat = 'online' | 'in-person'

export interface MockEvent {
  id: string
  title: string
  category: EventCategory
  format: EventFormat
  /** ISO date */
  date: string
  seatsLeft: number
}

export const categoryLabels: Record<EventCategory, string> = {
  design: 'Design',
  engineering: 'Engineering',
  product: 'Product',
}

export const mockEvents: MockEvent[] = [
  {
    id: 'evt_1',
    title: 'Design tokens in practice',
    category: 'design',
    format: 'online',
    date: '2026-11-04',
    seatsLeft: 42,
  },
  {
    id: 'evt_2',
    title: 'Accessible forms workshop',
    category: 'design',
    format: 'in-person',
    date: '2026-11-12',
    seatsLeft: 8,
  },
  {
    id: 'evt_3',
    title: 'React Server state with TanStack Query',
    category: 'engineering',
    format: 'online',
    date: '2026-11-18',
    seatsLeft: 120,
  },
  {
    id: 'evt_4',
    title: 'Type-safe forms with Zod',
    category: 'engineering',
    format: 'online',
    date: '2026-12-02',
    seatsLeft: 0,
  },
  {
    id: 'evt_5',
    title: 'Roadmapping without the drama',
    category: 'product',
    format: 'in-person',
    date: '2026-12-09',
    seatsLeft: 15,
  },
  {
    id: 'evt_6',
    title: 'Discovery interviews 101',
    category: 'product',
    format: 'online',
    date: '2027-01-14',
    seatsLeft: 60,
  },
  {
    id: 'evt_7',
    title: 'Testing UI with Playwright',
    category: 'engineering',
    format: 'in-person',
    date: '2027-01-21',
    seatsLeft: 4,
  },
  {
    id: 'evt_8',
    title: 'Dark mode that doesn’t hurt',
    category: 'design',
    format: 'online',
    date: '2027-02-03',
    seatsLeft: 33,
  },
]
