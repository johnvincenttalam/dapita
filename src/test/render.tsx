import { QueryClient } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { AppProviders } from '@/app/providers'
import { routes } from '@/app/routes'
import type { Theme } from '@/lib/theme'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

interface ProviderOptions extends Omit<RenderOptions, 'wrapper'> {
  defaultTheme?: Theme
}

/** Every app provider around `children`, for `render` or `renderHook`. */
export function createTestWrapper(queryClient: QueryClient, defaultTheme?: Theme) {
  return function TestProviders({ children }: { children: ReactNode }) {
    return (
      <AppProviders queryClient={queryClient} defaultTheme={defaultTheme}>
        {children}
      </AppProviders>
    )
  }
}

/** Renders a component inside every app provider (theme, query client, tooltips, toaster). */
export function renderWithProviders(ui: ReactElement, { defaultTheme, ...options }: ProviderOptions = {}) {
  const queryClient = createTestQueryClient()
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(ui, { wrapper: createTestWrapper(queryClient, defaultTheme), ...options }),
  }
}

/** Renders the real route tree at `path` using an in-memory router. */
export function renderRoute(path: string, options: ProviderOptions = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return { router, ...renderWithProviders(<RouterProvider router={router} />, options) }
}
