import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { renderRoute } from '@/test/render'

const BOOK_PATH = '/shops/the-good-cut-barbershop/book?service=svc_mens_haircut'

describe('welcome and account type (design screens 1–2)', () => {
  it('leads from the welcome screen to the account type choice', async () => {
    const { user, router } = renderRoute('/welcome')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dapita' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/auth/sign-in')

    await user.click(screen.getByRole('link', { name: 'Get Started' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'How will you use Dapita?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /i’m a business owner/i })).toHaveAttribute('href', '/business/sign-up')

    await user.click(screen.getByRole('link', { name: 'Skip' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('customer sign-up (plan step 5 exit: guest → sign-up → back to the intended action)', () => {
  it('returns a guest to the booking they started after signing up', async () => {
    const { user, router } = renderRoute(BOOK_PATH)

    // Booking needs an account: sign-in → "Create an account" → customer → sign-up, keeping `next`.
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Create an account' }))
    await user.click(await screen.findByRole('link', { name: /i’m a customer/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument()
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent(BOOK_PATH)}`)

    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Your name is required')).toBeInTheDocument()
    expect(screen.getByText('Accept the terms to create an account')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /your name/i }), 'Lea Cruz')
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'lea@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'mirror42')
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms of use/i }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/we sent a verification link to lea@example.com/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Continue' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Book appointment' })).toBeInTheDocument()
    expect(router.state.location.pathname + router.state.location.search).toBe(BOOK_PATH)
  })

  it('sends a new customer who started from a business page to the marketplace', async () => {
    const { user, router } = renderRoute('/auth/sign-up?next=%2Fbusiness')
    await user.type(await screen.findByRole('textbox', { name: /your name/i }), 'John Doe')
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'john@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'mirror42')
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms of use/i }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await user.click(await screen.findByRole('link', { name: 'Continue' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByText(/You don’t have access/)).not.toBeInTheDocument()
  })

  it('shows a taken email on the email field', async () => {
    const { user } = renderRoute('/auth/sign-up')
    await user.type(await screen.findByRole('textbox', { name: /your name/i }), 'Someone')
    await user.type(screen.getByRole('textbox', { name: /email/i }), mockUsers.customer.email)
    await user.type(screen.getByLabelText(/^password/i), 'mirror42')
    await user.click(screen.getByRole('checkbox', { name: /i agree to the terms of use/i }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText(/an account with this email already exists/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('business sign-up and verification (MER-01, doc §7.4)', () => {
  it('verifies the email and continues to listing set-up', async () => {
    const { user, router } = renderRoute('/business/sign-up')
    expect(await screen.findByRole('heading', { level: 1, name: 'List your business' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /your name/i }), 'Lea Cruz')
    await user.type(screen.getByRole('textbox', { name: /business name/i }), 'Lea’s Nail Bar')
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'owner@lea.ph')
    await user.type(screen.getByRole('textbox', { name: /mobile number/i }), '0917 123 4567')
    await user.type(screen.getByLabelText(/^password/i), 'mirror42')
    await user.click(screen.getByRole('checkbox', { name: /merchant listing policy/i }))
    await user.click(screen.getByRole('button', { name: 'Create business account' }))

    await user.click(await screen.findByRole('link', { name: 'Open verification link' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Email verified' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Continue' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/business/onboarding'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Set up your listing' })).toBeInTheDocument()
  })
})

describe('password recovery', () => {
  it('gives the same answer for any email', async () => {
    const { user } = renderRoute('/auth/forgot-password')
    await user.type(await screen.findByRole('textbox', { name: /email/i }), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/if there’s an account for nobody@example.com/i)).toBeInTheDocument()
  })
})

describe('customer account (CUS-06)', () => {
  it('saves the profile and updates the name in the header', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    const { user } = renderRoute('/account')
    const name = await screen.findByRole('textbox', { name: /your name/i })
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await user.clear(name)
    await user.type(name, 'Andrea Cruz')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('button', { name: /account menu for andrea cruz/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('lists accepted documents and records a deletion request after confirmation', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
    const { user } = renderRoute('/account/privacy')
    const agreements = await screen.findByRole('region', { name: 'Agreements' })
    expect(await within(agreements).findByRole('link', { name: 'Terms of use' })).toBeInTheDocument()
    expect(within(agreements).getByRole('link', { name: 'Privacy notice' })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Request account deletion' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }))

    expect(await screen.findByText(/deletion requested on/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request account deletion' })).not.toBeInTheDocument()
  })
})
