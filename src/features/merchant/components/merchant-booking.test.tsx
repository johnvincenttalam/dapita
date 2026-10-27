import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { DeclineReasonDialog } from '@/features/merchant/components/DeclineReasonDialog'
import { MerchantBookingDetail } from '@/features/merchant/components/MerchantBookingDetail'
import { ProposeTimeDialog } from '@/features/merchant/components/ProposeTimeDialog'
import { ApiError } from '@/lib/api-client'
import { addMinutes, zonedDateTime } from '@/lib/datetime'
import { bookingsService } from '@/services/bookings.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import type { WeeklyHours } from '@/types/business'
import type { BookingDetails, BookingStatus } from '@/types/booking'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila.
const NOW = new Date('2026-10-21T03:00:00Z')
const day = { open: '10:00', close: '21:00' } as const
const hours: WeeklyHours = { 0: [day], 1: [day], 2: [day], 3: [day], 4: [day], 5: [day], 6: [day] }

function make(overrides: Partial<BookingDetails> & { status: BookingStatus }): BookingDetails {
  const start = overrides.start ?? zonedDateTime('2026-10-23', '14:00').toISOString()
  return {
    id: 'bk_andrea_pending',
    reference: 'DP-7KQ2PA',
    customerId: 'usr_customer',
    contact: { name: 'Andrea Reyes', email: 'andrea@example.com' },
    businessId: 'biz_good_cut',
    serviceId: 'svc_cut_styling',
    staffId: 'stf_ken',
    staffName: 'Ken',
    start,
    end: addMinutes(start, 60).toISOString(),
    bookingMethod: 'request',
    service: { name: 'Haircut & Styling', durationMinutes: 60, price: { type: 'fixed', amount: 450 } },
    policyVersion: 1,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    respondBy: zonedDateTime('2026-10-22', '11:00').toISOString(),
    business: {
      id: 'biz_good_cut',
      slug: 'the-good-cut-barbershop',
      name: 'The Good Cut Barbershop',
      address: '',
      areaName: 'Poblacion',
    },
    events: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('DeclineReasonDialog', () => {
  it('sends a trimmed reason, or undefined when left empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(
      <DeclineReasonDialog customerName="Andrea Reyes" open onOpenChange={() => {}} onSubmit={onSubmit} />,
    )
    expect(screen.getByRole('alertdialog', { name: 'Decline this request?' })).toBeInTheDocument()
    expect(
      screen.getByText('Andrea Reyes will see that you declined, plus your reason if you give one.'),
    ).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Reason (optional)'), '  Fully booked  ')
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }))
    expect(onSubmit).toHaveBeenLastCalledWith('Fully booked')

    rerender(
      <DeclineReasonDialog customerName="Andrea Reyes" open={false} onOpenChange={() => {}} onSubmit={onSubmit} />,
    )
    rerender(<DeclineReasonDialog customerName="Andrea Reyes" open onOpenChange={() => {}} onSubmit={onSubmit} />)
    await userEvent.clear(screen.getByLabelText('Reason (optional)'))
    await userEvent.click(screen.getByRole('button', { name: 'Decline request' }))
    expect(onSubmit).toHaveBeenLastCalledWith(undefined)
  })
})

describe('ProposeTimeDialog', () => {
  const booking = make({ status: 'pending' })
  const other = make({
    id: 'bk_other',
    status: 'confirmed',
    contact: { name: 'John Dela Cruz', email: 'john@example.com' },
    start: zonedDateTime('2026-10-23', '15:00').toISOString(),
    end: zonedDateTime('2026-10-23', '15:30').toISOString(),
  })

  function renderDialog(onSubmit = vi.fn().mockResolvedValue(undefined)) {
    render(
      <ProposeTimeDialog
        booking={booking}
        hours={hours}
        closures={[]}
        bookings={[booking, other]}
        now={NOW}
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
      />,
    )
    return onSubmit
  }

  it('disables the requested time and flags clashes', async () => {
    const onSubmit = renderDialog()
    await userEvent.click(screen.getByRole('radio', { name: 'Fri, Oct 23' }))

    expect(screen.getByRole('radio', { name: '2:00 PM' })).toBeDisabled()
    await userEvent.click(screen.getByRole('radio', { name: '3:00 PM, clashes with another booking' }))
    expect(screen.getByText(/^Ken already has a confirmed booking at 3:00–3:30 PM/)).toBeInTheDocument()
    expect(screen.getByText('Only bookings made on Dapita are checked.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Send new time' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        start: zonedDateTime('2026-10-23', '15:00').toISOString(),
        message: undefined,
      }),
    )
  })

  it('offers nothing sooner than two hours from now', async () => {
    renderDialog()
    await userEvent.click(screen.getByRole('radio', { name: 'Today, Wed, Oct 21' }))
    expect(screen.queryByRole('radio', { name: '12:30 PM' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '1:00 PM' })).toBeEnabled()
  })

  it('shows a server error inline and stays open', async () => {
    renderDialog(
      vi.fn().mockRejectedValue(new Error('That’s too soon for the customer to answer. Choose a later time.')),
    )
    await userEvent.click(screen.getByRole('radio', { name: 'Fri, Oct 23' }))
    await userEvent.click(screen.getByRole('radio', { name: '4:00 PM' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send new time' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That’s too soon for the customer to answer. Choose a later time.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('MerchantBookingDetail', () => {
  it('shows the server error and refetches on 409', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
    vi.spyOn(bookingsService, 'respondToBooking').mockRejectedValue(new ApiError('This booking has expired.', 409))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const onAnswered = vi.fn()
    const booking = make({ status: 'pending' })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MerchantBookingDetail booking={booking} bookings={[booking]} onAnswered={onAnswered} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['bookings'] }))
    expect(onAnswered).not.toHaveBeenCalled()
  })

  it('shows a clash note above the actions for a pending request', () => {
    const booking = make({ status: 'pending' })
    const other = make({
      id: 'bk_other',
      status: 'confirmed',
      contact: { name: 'John Dela Cruz', email: 'john@example.com' },
      start: zonedDateTime('2026-10-23', '14:30').toISOString(),
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <MerchantBookingDetail booking={booking} bookings={[booking, other]} onAnswered={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(
      screen.getByText('Ken already has a confirmed booking at 2:30–3:30 PM (John Dela Cruz).'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled()
  })
})
