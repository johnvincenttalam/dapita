import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { ThemeProvider } from '@/app/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient as defaultQueryClient } from '@/lib/query-client'
import type { Theme } from '@/lib/theme'

interface AppProvidersProps {
  children: ReactNode
  /** Tests pass a fresh client so cached data never leaks between them. */
  queryClient?: QueryClient
  defaultTheme?: Theme
}

/** Every app-wide context in one place. Order matters: theme → data → UI helpers. */
export function AppProviders({ children, queryClient = defaultQueryClient, defaultTheme }: AppProvidersProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
