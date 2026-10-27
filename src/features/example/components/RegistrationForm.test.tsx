import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RegistrationForm } from '@/features/example/components/RegistrationForm'
import { MOCK_TAKEN_EMAIL } from '@/services/account.service'
import { renderWithProviders } from '@/test/render'

describe('RegistrationForm', () => {
  it('shows required-field errors and wires them to the inputs', async () => {
    const { user } = renderWithProviders(<RegistrationForm />)

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const nameInput = await screen.findByRole('textbox', { name: /full name/i })
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput).toHaveAccessibleDescription('Full name is required')
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('You must accept the terms to continue')).toBeInTheDocument()
  })

  it('validates email format and password confirmation', async () => {
    const { user } = renderWithProviders(<RegistrationForm />)

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'jordan@')
    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.type(screen.getByLabelText(/confirm password/i), 'secret999')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('shows a form-level error when the mock server rejects the email', async () => {
    const { user } = renderWithProviders(<RegistrationForm />)

    await user.type(screen.getByRole('textbox', { name: /full name/i }), 'Jordan Rivera')
    await user.type(screen.getByRole('textbox', { name: /email/i }), MOCK_TAKEN_EMAIL)

    await user.click(screen.getByRole('combobox', { name: /role/i }))
    await user.click(await screen.findByRole('option', { name: 'Designer' }))

    await user.click(screen.getByRole('button', { name: /date of birth/i }))
    const calendar = await screen.findByRole('grid')
    // Pick any enabled day in the default (current) month view after choosing an old year.
    await user.selectOptions(screen.getByRole('combobox', { name: /year/i }), '1990')
    await user.click(within(calendar).getAllByRole('button', { name: /1990/ })[0]!)

    await user.type(screen.getByLabelText(/^password/i), 'secret123')
    await user.type(screen.getByLabelText(/confirm password/i), 'secret123')
    await user.click(screen.getByRole('checkbox', { name: /accept the terms/i }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 })
    expect(alert).toHaveTextContent('An account with this email already exists')
  })
})
