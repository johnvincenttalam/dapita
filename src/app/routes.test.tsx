import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'
import { renderRoute } from '@/test/render'

/** Starts the test with a mock session, as if the user had signed in earlier. */
function signInAs(account: MockAccount) {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
}

describe('marketplace layout', () => {
  it('renders the home route with header, tab bar and footer', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: /find your style/i })).toBeInTheDocument()

    const mainNav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(mainNav).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    const tabBar = screen.getByRole('navigation', { name: 'Tab bar' })
    expect(
      within(tabBar)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Home', 'Explore', 'Bookings', 'Inbox', 'Profile'])
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/mock data/i)
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/sign-in')
  })

  it('submits the header search to the explore page', async () => {
    const { user, router } = renderRoute('/')
    const header = await screen.findByRole('banner')
    await user.type(await within(header).findByRole('searchbox', { name: /search services/i }), 'fade haircut{Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: 'Explore' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=fade%20haircut')
    expect(await screen.findByText('1 shop for “fade haircut”')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fade Factory Barbers' })).toHaveAttribute(
      'href',
      '/shops/fade-factory-barbers',
    )
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('HomeExplore')
  })

  it('shows not-found inside the marketplace layout and links home', async () => {
    const { user, router } = renderRoute('/does-not-exist')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByText('/does-not-exist')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Tab bar' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /back to home/i }))
    expect(await screen.findByRole('heading', { level: 1, name: /find your style/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('discovery', () => {
  it('shows category shortcuts and featured shops on the home page', async () => {
    renderRoute('/')
    expect(await screen.findByRole('link', { name: 'Spa & Massage' })).toHaveAttribute(
      'href',
      '/categories/spa-massage',
    )
    expect(screen.getByRole('link', { name: 'Gowns & Dresses (coming soon)' })).toBeInTheDocument()
    const featured = await screen.findByRole('list', { name: 'Featured shops' })
    expect(within(featured).getByRole('link', { name: 'The Good Cut Barbershop' })).toBeInTheDocument()
    // Reviews are P1: no invented ratings (doc §9.3).
    expect(within(featured).getAllByText('No reviews yet').length).toBeGreaterThan(0)
  })

  it('filters a category by sub-category chips', async () => {
    const { user, router } = renderRoute('/categories/spa-massage')
    expect(await screen.findByRole('heading', { level: 1, name: 'Spa & Massage' })).toBeInTheDocument()
    const shops = await screen.findByRole('list', { name: 'Spa & Massage shops' })
    expect(within(shops).getAllByRole('article')).toHaveLength(3)

    const chips = screen.getByRole('navigation', { name: 'Spa & Massage types' })
    expect(within(chips).getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'true')
    await user.click(within(chips).getByRole('link', { name: 'Facial' }))

    const facials = await screen.findByRole('list', { name: 'Facial shops' })
    await waitFor(() => expect(within(facials).getAllByRole('article')).toHaveLength(1))
    expect(within(facials).getByRole('link', { name: 'Serenity Wellness Spa' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?type=facial')
  })

  it('marks P2 categories as coming soon', async () => {
    renderRoute('/categories/gowns-dresses')
    expect(await screen.findByText('Gowns & Dresses is coming soon')).toBeInTheDocument()
  })

  it('narrows explore results with category chips and keeps filters in the URL', async () => {
    const { user, router } = renderRoute('/explore')
    expect(await screen.findByText('11 shops')).toBeInTheDocument()

    const chips = screen.getByRole('navigation', { name: 'Categories' })
    await user.click(within(chips).getByRole('link', { name: 'Nails' }))
    expect(await screen.findByText('2 shops')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?category=nails')
  })

  it('suggests clearing filters when nothing matches', async () => {
    const { user, router } = renderRoute('/explore?area=talomo&price=300')
    expect(await screen.findByText('No shops match your search')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('11 shops')).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('shows a shop profile with services, hours, policies and staff', async () => {
    const { user } = renderRoute('/shops/the-good-cut-barbershop')
    expect(await screen.findByRole('heading', { level: 1, name: 'The Good Cut Barbershop' })).toBeInTheDocument()
    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('HomeThe Good Cut Barbershop')
    expect(screen.getByText('Request to book')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Opening hours' })).toBeInTheDocument()
    expect(screen.getByText(/free cancellation up to 3 hours/i)).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Map showing The Good Cut Barbershop' })).toBeInTheDocument()

    const book = await screen.findByRole('link', { name: 'Book Men’s Haircut' })
    expect(book).toHaveAttribute('href', '/shops/the-good-cut-barbershop/book?service=svc_mens_haircut')

    await user.click(screen.getByRole('tab', { name: 'Services' }))
    expect(await screen.findByRole('region', { name: 'Beard & Shave' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Staff' }))
    expect(await screen.findByText('Senior barber')).toBeInTheDocument()
  })

  it('explains when a shop isn’t publicly listed', async () => {
    renderRoute('/shops/ritz-grooming-lounge')
    expect(await screen.findByRole('heading', { level: 1, name: 'Shop not found' })).toBeInTheDocument()
    expect(screen.getByText('This shop isn’t available')).toBeInTheDocument()
  })

  it('shows a service and sends guests to sign in before booking', async () => {
    const { user, router } = renderRoute('/shops/the-good-cut-barbershop/services/svc_kids_cut')
    expect(await screen.findByRole('heading', { level: 1, name: 'Kids’ Haircut (12 and under)' })).toBeInTheDocument()
    expect(screen.getAllByText('₱180').length).toBeGreaterThan(0)
    expect(screen.getByText('30 mins')).toBeInTheDocument()
    expect(screen.getByText(/parent or guardian must stay/i)).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent(
      'HomeThe Good Cut BarbershopKids’ Haircut (12 and under)',
    )

    await user.click(screen.getByRole('link', { name: /book this service/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.search).toBe(
      `?next=${encodeURIComponent('/shops/the-good-cut-barbershop/book?service=svc_kids_cut')}`,
    )
  })
})

describe('customer area', () => {
  it('sends guests to sign-in and returns them after signing in', async () => {
    const { user, router } = renderRoute('/bookings')
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/bookings')}`)

    await user.click(screen.getByRole('button', { name: 'Customer' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'My bookings' }, { timeout: 3000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/bookings')
    const accountNav = screen.getByRole('navigation', { name: 'Account' })
    expect(within(accountNav).getByRole('link', { name: 'My bookings' })).toHaveAttribute('aria-current', 'page')
    expect(within(accountNav).getByRole('link', { name: /favorites/i })).toHaveTextContent('Soon')
  })

  it('keeps signed-in customers out of the merchant dashboard', async () => {
    signInAs('customer')
    renderRoute('/business')
    expect(await screen.findByRole('heading', { level: 1, name: /don’t have access/i })).toBeInTheDocument()
    expect(screen.getByText(/this section is for merchants/i)).toBeInTheDocument()
  })

  it('opens the booking a notification is about', async () => {
    signInAs('customer')
    const { user, router } = renderRoute('/bookings')
    // The proposed time and Serenity's unread message.
    await user.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }))
    await user.click(await screen.findByRole('link', { name: /new time proposed/i }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/bookings/bk_andrea_alternative'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Swedish Massage' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
  })

  it('signs out from the account menu', async () => {
    signInAs('customer')
    const { user } = renderRoute('/account')
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /account menu for andrea reyes/i }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_SESSION_KEY)).toBeNull()
  })
})

describe('merchant dashboard', () => {
  it('renders the dashboard shell with business identity and navigation', async () => {
    signInAs('merchant')
    renderRoute('/business/bookings')
    expect(await screen.findByRole('heading', { level: 1, name: 'Bookings' })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /account menu for paolo mendoza/i })).toHaveTextContent(
      'The Good Cut Barbershop',
    )
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('DashboardBookings')
    const sidebar = screen.getByRole('navigation', { name: 'Business dashboard' })
    expect(within(sidebar).getByRole('link', { name: /^Bookings/ })).toHaveAttribute('aria-current', 'page')
    expect(within(sidebar).getByRole('link', { name: /^Messages/ })).toHaveAttribute('href', '/business/messages')
    expect(within(sidebar).getByRole('link', { name: /^staff\s*\(coming soon\)$/i })).toBeInTheDocument()
    // The waiting-request count arrives with the bookings list.
    expect(await within(sidebar).findByRole('link', { name: 'Bookings, 3 waiting' })).toBeInTheDocument()
  })

  it('marks later-release pages as planned', async () => {
    signInAs('merchant')
    renderRoute('/business/insights')
    expect(await screen.findByRole('heading', { level: 1, name: 'Analytics' })).toBeInTheDocument()
    expect(screen.getByText('P1 · After pilot validation')).toBeInTheDocument()
  })

  it('shows not-found inside the dashboard for unknown pages', async () => {
    signInAs('merchant')
    renderRoute('/business/nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Business dashboard' })).toBeInTheDocument()
  })
})

describe('admin console', () => {
  it('is available to administrators only', async () => {
    signInAs('admin')
    renderRoute('/admin/merchants')
    expect(await screen.findByRole('heading', { level: 1, name: 'Merchants' })).toBeInTheDocument()
    const sidebar = screen.getByRole('navigation', { name: 'Admin console' })
    expect(within(sidebar).getByRole('link', { name: 'Merchants' })).toHaveAttribute('aria-current', 'page')
  })

  it('redirects guests to sign-in', async () => {
    const { router } = renderRoute('/admin')
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/auth/sign-in')
  })
})

describe('developer reference', () => {
  it('serves the template component gallery under /dev in development builds', async () => {
    renderRoute('/dev/components')
    expect(await screen.findByRole('heading', { level: 1, name: 'Component gallery' })).toBeInTheDocument()
  })
})
