import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type * as BaselineModule from '@/features/design-tweaks/baseline'
import DesignTweaks from '@/features/design-tweaks/DesignTweaks'
import { TWEAKS_STYLE_ID } from '@/features/design-tweaks/baseline'
import { renderWithProviders } from '@/test/render'

// jsdom doesn't load globals.css, so the panel gets the baseline the browser would read.
vi.mock('@/features/design-tweaks/baseline', async (importOriginal) => ({
  ...(await importOriginal<typeof BaselineModule>()),
  readBaseline: () => ({
    light: {
      primary: { l: 0.565, c: 0.17, h: 14 },
      'primary-foreground': { l: 0.99, c: 0.005, h: 14 },
      background: { l: 0.975, c: 0.008, h: 40 },
      foreground: { l: 0.24, c: 0.02, h: 285 },
    },
    dark: {},
    radiusRem: 0.75,
  }),
}))

describe('design tweaks panel', () => {
  it('changes tokens live, checks contrast, copies CSS and closes with Escape', async () => {
    const { user } = renderWithProviders(<DesignTweaks />, { defaultTheme: 'light' })

    await user.click(screen.getByRole('button', { name: /design tweaks/i }))
    const panel = screen.getByRole('dialog', { name: 'Design tweaks' })
    expect(within(panel).getByRole('heading', { name: 'Design tweaks' })).toHaveFocus()

    fireEvent.change(within(panel).getByRole('slider', { name: 'Brand hue' }), { target: { value: '300' } })
    await waitFor(() =>
      expect(document.getElementById(TWEAKS_STYLE_ID)?.textContent).toContain('--primary: oklch(0.565 0.17 300);'),
    )

    fireEvent.change(within(panel).getByRole('slider', { name: 'Primary lightness' }), { target: { value: '0.85' } })
    expect(within(panel).getByText(/button text on primary/i).nextElementSibling).toHaveTextContent('fails AA')
    expect(within(panel).getByText(/text pairs fail wcag aa/i)).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: 'Copy CSS' }))
    // user-event installs a clipboard stub, so read back what was copied.
    expect(await navigator.clipboard.readText()).toContain(':root,\n.light {')

    await user.click(within(panel).getByRole('button', { name: 'Reset all' }))
    await waitFor(() => expect(document.getElementById(TWEAKS_STYLE_ID)).toBeNull())

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /design tweaks/i })).toHaveFocus()
  })
})
