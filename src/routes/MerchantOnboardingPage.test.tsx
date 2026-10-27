import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { AppProviders } from '@/app/providers'
import { ListingStatusBanner } from '@/features/merchant/components/ListingStatusBanner'
import { createQueryClient } from '@/lib/query-client'
import { adminService } from '@/services/admin.service'
import { authService, signUpConsents } from '@/services/auth.service'
import { merchantBusinessService } from '@/services/merchant-business.service'
import { merchantServicesService } from '@/services/merchant-services.service'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import type { BusinessStatus } from '@/types/business'
import MerchantOnboardingPage from '@/routes/MerchantOnboardingPage'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila.
const NOW = new Date('2026-10-21T03:00:00Z')

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/business/onboarding', Component: MerchantOnboardingPage },
      { path: '/business', element: <p>Dashboard</p> },
    ],
    { initialEntries: [path] },
  )
  render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

async function signUpOwner() {
  const owner = await authService.signUp({
    accountType: 'business',
    name: 'Lea Cruz',
    email: 'owner@lea.ph',
    phone: '09171234567',
    password: 'mirror42',
    businessName: 'Lea’s Nail Bar',
    consents: signUpConsents('business'),
  })
  return owner.memberships[0]?.businessId ?? ''
}

async function finishListing(id: string) {
  await merchantBusinessService.updateProfile(id, {
    name: 'Lea’s Nail Bar',
    description: 'Gel nails, nail art and pedicures in a calm little studio.',
    categoryIds: ['cat_nails'],
    areaId: 'area_bajada',
    address: '12 J.P. Laurel Ave, Bajada, Davao City',
    phone: '',
  })
  await merchantServicesService.createService(id, {
    name: 'Gel Manicure',
    categoryId: 'sub_manicure',
    description: '',
    requirements: '',
    price: { type: 'fixed', amount: 450 },
    durationMinutes: 60,
    bufferMinutes: 0,
    featured: false,
    active: true,
  })
  await merchantBusinessService.updatePolicies(id, {
    cancellation: 'Free cancellation up to 3 hours before your appointment.',
    noShow: '',
    deposit: '',
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MerchantOnboardingPage', () => {
  it('starts with the details and moves on once they’re saved', async () => {
    const user = userEvent.setup()
    await signUpOwner()
    const router = renderAt('/business/onboarding')
    expect(await screen.findByRole('heading', { level: 1, name: 'Set up your listing' })).toBeInTheDocument()
    const steps = await screen.findByRole('navigation', { name: 'Setup steps' })
    expect(within(steps).getByRole('link', { name: /Details/ })).toHaveAttribute('aria-current', 'step')

    await user.type(
      await screen.findByRole('textbox', { name: /Description/ }),
      'Gel nails, nail art and pedicures in a calm little studio.',
    )
    await user.click(screen.getByRole('checkbox', { name: 'Nails' }))
    await user.selectOptions(screen.getByRole('combobox', { name: /Area/ }), 'Bajada')
    await user.type(screen.getByRole('textbox', { name: /Address/ }), '12 J.P. Laurel Ave, Bajada, Davao City')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    await waitFor(() => expect(router.state.location.search).toBe('?step=hours'))
    expect(await screen.findByRole('heading', { name: 'Opening hours' })).toBeInTheDocument()
    expect(within(steps).getByRole('link', { name: /Details, done/ })).toBeInTheDocument()
  })

  it('offers the categories just chosen when adding the first service', async () => {
    const user = userEvent.setup()
    await signUpOwner()
    renderAt('/business/onboarding')
    await user.type(
      await screen.findByRole('textbox', { name: /Description/ }),
      'Gel nails, nail art and pedicures in a calm little studio.',
    )
    await user.click(screen.getByRole('checkbox', { name: 'Nails' }))
    await user.selectOptions(screen.getByRole('combobox', { name: /Area/ }), 'Bajada')
    await user.type(screen.getByRole('textbox', { name: /Address/ }), '12 J.P. Laurel Ave, Bajada, Davao City')
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))
    await screen.findByRole('heading', { name: 'Opening hours' })
    await user.click(screen.getByRole('button', { name: 'Save and continue' }))

    // Nails' subcategories, not "choose your categories first".
    expect(await screen.findByRole('radio', { name: 'Manicure' })).toBeInTheDocument()
    expect(screen.queryByText(/Choose your business categories first/)).not.toBeInTheDocument()
  })

  it('adds services without leaving the setup', async () => {
    const user = userEvent.setup()
    const id = await signUpOwner()
    await finishListing(id)
    renderAt('/business/onboarding?step=services')
    await user.click(await screen.findByRole('button', { name: 'Add a service' }))
    await user.type(screen.getByRole('textbox', { name: /Service name/ }), 'Classic Pedicure')
    await user.type(screen.getByRole('textbox', { name: /^Price/ }), '350')
    await user.click(screen.getByRole('button', { name: 'Add service' }))

    const list = await screen.findByRole('list', { name: 'Your services' })
    expect(await within(list).findByText('Classic Pedicure')).toBeInTheDocument()
    expect(within(list).getByText('Gel Manicure')).toBeInTheDocument()
  })

  it('lists what’s missing before the listing can go to review', async () => {
    await signUpOwner()
    renderAt('/business/onboarding?step=review')
    const review = await screen.findByRole('region', { name: 'Ready to submit?' })
    expect(within(review).getByText('Add a description, a category, an area and an address.')).toBeInTheDocument()
    expect(within(review).getByRole('link', { name: 'Fix business details' })).toHaveAttribute(
      'href',
      '/business/onboarding',
    )
    expect(within(review).getByRole('button', { name: 'Submit for review' })).toBeDisabled()
  })

  it('submits a finished listing for review', async () => {
    const user = userEvent.setup()
    const id = await signUpOwner()
    await finishListing(id)
    renderAt('/business/onboarding?step=review')
    await user.click(await screen.findByRole('button', { name: 'Submit for review' }))

    expect(await screen.findByRole('heading', { name: 'Your listing is waiting for review' })).toBeInTheDocument()
    expect((await merchantBusinessService.getBusiness(id)).business.status).toBe('pending_review')
  })

  it('shows what Dapita asked to change', async () => {
    const id = await signUpOwner()
    await finishListing(id)
    await merchantBusinessService.submitForReview(id)
    const ownerSession = localStorage.getItem(MOCK_SESSION_KEY) ?? ''
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.admin.id)
    await adminService.moderateMerchant(id, { action: 'request_changes', reason: 'Add your street number.' })
    localStorage.setItem(MOCK_SESSION_KEY, ownerSession)

    renderAt('/business/onboarding')
    expect(await screen.findByText(/Dapita asked for changes/)).toHaveTextContent('Add your street number.')
  })

  it('tells an owner whose listing is live that there’s nothing to set up', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
    renderAt('/business/onboarding')
    expect(await screen.findByRole('heading', { name: 'Your listing is live' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View shop page' })).toHaveAttribute(
      'href',
      '/shops/the-good-cut-barbershop',
    )
  })
})

describe('ListingStatusBanner', () => {
  function renderBanner(status: BusinessStatus, path = '/business') {
    const router = createMemoryRouter([{ path: '*', element: <ListingStatusBanner status={status} /> }], {
      initialEntries: [path],
    })
    render(<RouterProvider router={router} />)
  }

  it('points a new owner back to setup', () => {
    renderBanner('draft')
    expect(screen.getByText(/isn’t live yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue setup' })).toHaveAttribute('href', '/business/onboarding')
  })

  it('stays out of the way on the setup page and once live', () => {
    renderBanner('draft', '/business/onboarding')
    expect(screen.queryByText(/isn’t live yet/)).not.toBeInTheDocument()
    renderBanner('approved')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('includes the reason Dapita gave', () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <ListingStatusBanner status="changes_requested" note="Add your street number." /> }],
      { initialEntries: ['/business'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('status')).toHaveTextContent('Add your street number.')
  })

  it('explains a listing under review', () => {
    renderBanner('pending_review')
    expect(screen.getByText(/waiting for review/)).toBeInTheDocument()
  })
})
