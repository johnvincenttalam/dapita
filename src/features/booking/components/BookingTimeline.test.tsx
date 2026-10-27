import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BookingTimeline } from '@/features/booking/components/BookingTimeline'
import type { BookingEvent } from '@/types/booking'

const events: BookingEvent[] = [
  {
    id: 'e1',
    bookingId: 'bk',
    action: 'submit',
    actor: 'customer',
    actorId: 'usr',
    from: 'draft',
    to: 'pending',
    at: '2026-10-21T01:00:00Z',
  },
  {
    id: 'e2',
    bookingId: 'bk',
    action: 'propose_alternative',
    actor: 'merchant',
    actorId: 'usr_owner',
    from: 'pending',
    to: 'alternative_proposed',
    reason: 'Ken’s free at 3',
    at: '2026-10-21T02:00:00Z',
  },
]

describe('BookingTimeline', () => {
  it('speaks to the merchant when they are the viewer', () => {
    render(<BookingTimeline events={events} viewer="merchant" />)
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'The customer sent the request'),
    ).toBeInTheDocument()
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'You proposed another time'),
    ).toBeInTheDocument()
    expect(screen.getByText('“Ken’s free at 3”')).toBeInTheDocument()
  })

  it('speaks to the customer by default', () => {
    render(<BookingTimeline events={events} />)
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'You sent the request'),
    ).toBeInTheDocument()
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'The shop proposed another time'),
    ).toBeInTheDocument()
  })
})
