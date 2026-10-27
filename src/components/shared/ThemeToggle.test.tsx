import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { renderWithProviders } from '@/test/render'

describe('ThemeToggle', () => {
  it('switches to dark, applies the class and persists the choice', async () => {
    const { user } = renderWithProviders(<ThemeToggle />, { defaultTheme: 'light' })
    expect(document.documentElement).not.toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: /change theme/i }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Dark' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('follows the system preference when set to system', async () => {
    // The test setup's matchMedia mock reports a light system theme.
    const { user } = renderWithProviders(<ThemeToggle />, { defaultTheme: 'dark' })
    expect(document.documentElement).toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: /change theme/i }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'System' }))

    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('marks the current theme as checked', async () => {
    const { user } = renderWithProviders(<ThemeToggle />, { defaultTheme: 'light' })
    await user.click(screen.getByRole('button', { name: /change theme/i }))
    expect(await screen.findByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false')
  })
})
