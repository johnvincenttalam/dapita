import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { renderRoute } from '@/test/render'

// These tests use the real clock: the mock database seeds bookings relative to now.

function signInAsCustomer() {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
}

describe('booking request flow (design screens 6–7)', () => {
  it('asks for a service first when none is chosen', async () => {
    signInAsCustomer()
    renderRoute('/shops/the-good-cut-barbershop/book')
    expect(await screen.findByRole('heading', { level: 2, name: 'Choose a service' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Book Men’s Haircut' })).toHaveAttribute(
      'href',
      '/shops/the-good-cut-barbershop/book?service=svc_mens_haircut',
    )
  })

  it('validates, sends a request and shows it as pending, never confirmed', async () => {
    signInAsCustomer()
    const { user, router } = renderRoute('/shops/the-good-cut-barbershop/book?service=svc_mens_haircut')
    expect(await screen.findByRole('heading', { level: 1, name: 'Book appointment' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Men’s Haircut' })).toBeInTheDocument()

    const staff = screen.getByRole('group', { name: /select staff/i })
    expect(
      within(staff)
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label')),
    ).toEqual(['Any available', 'Ken', 'Mark', 'James'])
    expect(within(staff).getByRole('radio', { name: 'Any available' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Later dates' })).toBeInTheDocument()

    // The summary shows the listed price, no fee and no in-app payment.
    const summary = screen.getByRole('complementary', { name: 'Booking summary' })
    expect(within(summary).getByText('Total')).toBeInTheDocument()
    expect(within(summary).getByText('Free')).toBeInTheDocument()
    expect(within(summary).getByText(/no payment is taken in the app/i)).toBeInTheDocument()
    expect(within(summary).getByText(/no shop is notified/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /send booking request/i }))
    const times = screen.getByRole('group', { name: 'Select time' })
    expect(await within(times).findByText('Choose a time')).toBeInTheDocument()
    expect(times).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Confirm that you’ve read the cancellation policy')).toBeInTheDocument()

    await user.click(within(staff).getByRole('radio', { name: 'Ken' }))
    await user.click(within(times).getAllByRole('radio')[0]!)
    await user.type(screen.getByRole('textbox', { name: /notes/i }), 'First visit')
    await user.click(screen.getByRole('checkbox', { name: /cancellation policy/i }))
    await user.click(screen.getByRole('button', { name: /send booking request/i }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Request sent!' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/bookings\/bk_[a-z0-9]+\/submitted$/)
    expect(screen.queryByText(/booking confirmed/i)).not.toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText(/The Good Cut Barbershop will confirm your preferred time/)).toBeInTheDocument()
    expect(screen.getByText(/men’s haircut with ken/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'View booking' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Men’s Haircut' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('You sent the request')
    expect(screen.getByText('First visit')).toBeInTheDocument()
  })
})

describe('my bookings (design screen 11)', () => {
  it('groups bookings into upcoming, past and cancelled tabs', async () => {
    signInAsCustomer()
    const { user, router } = renderRoute('/bookings')
    const upcoming = await screen.findByRole('list', { name: 'Upcoming bookings' })
    expect(within(upcoming).getAllByRole('article')).toHaveLength(3)
    expect(within(upcoming).getByText('New time proposed')).toBeInTheDocument()
    expect(within(upcoming).getByRole('link', { name: /review new time/i })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /past/i }))
    const past = await screen.findByRole('list', { name: 'Past bookings' })
    expect(within(past).getAllByRole('article')).toHaveLength(3)
    expect(router.state.location.search).toBe('?tab=past')

    await user.click(screen.getByRole('tab', { name: /cancelled/i }))
    const cancelled = await screen.findByRole('list', { name: 'Cancelled bookings' })
    expect(within(cancelled).getByText('Hilot & Wellness')).toBeInTheDocument()
  })

  it('confirms a booking only when the customer accepts the proposed time', async () => {
    signInAsCustomer()
    const { user } = renderRoute('/bookings/bk_andrea_alternative')
    expect(await screen.findByText(/new time proposed:/i)).toBeInTheDocument()
    expect(screen.getByText(/could you come at 7:30 pm instead/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept new time' }))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Status' })).toHaveTextContent('Confirmed'))
    expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('You accepted the new time')
    expect(screen.getByRole('button', { name: /add to calendar/i })).toBeInTheDocument()
  })

  it('shows the cancellation policy before cancelling', async () => {
    signInAsCustomer()
    const { user } = renderRoute('/bookings/bk_andrea_confirmed')
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(await within(dialog).findByText(/free cancellation up to 6 hours/i)).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: /reason/i }), 'Travelling')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }))

    await waitFor(() => expect(screen.getByRole('region', { name: 'Status' })).toHaveTextContent('Cancelled'))
    expect(screen.getByText('“Travelling”')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('doesn’t show other customers’ bookings', async () => {
    signInAsCustomer()
    renderRoute('/bookings/bk_gc_john')
    expect(await screen.findByText('We couldn’t find that booking')).toBeInTheDocument()
  })
})
