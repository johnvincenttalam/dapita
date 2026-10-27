import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError, getErrorMessage } from '@/lib/api-client'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: {
      /** Message for the success toast. Omit to show no toast. */
      successMessage?: string
      /** Set to false when the component renders the error itself. */
      showErrorToast?: boolean
    }
  }
}

function shouldRetry(failureCount: number, error: unknown) {
  // Client errors (4xx) will not succeed on retry.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only toast for background refetch failures; first-load errors are
        // rendered inline by the component through <ErrorState />.
        if (query.state.data !== undefined) toast.error(getErrorMessage(error))
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _context, mutation) => {
        const message = mutation.meta?.successMessage
        if (message) toast.success(message)
      },
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.showErrorToast !== false) toast.error(getErrorMessage(error))
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
