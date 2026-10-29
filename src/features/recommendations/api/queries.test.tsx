import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { useToggleFavoriteMutation } from '@/features/favorites/api/queries'
import { recommendationKeys } from '@/features/recommendations/api/queries'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
})

describe('recommendation queries', () => {
  it('saving a shop marks the recommendations stale', async () => {
    const queryClient = createQueryClient()
    const key = recommendationKeys.forViewer(mockUsers.customer.id)
    queryClient.setQueryData(key, [])
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useToggleFavoriteMutation(), { wrapper })

    act(() => result.current.mutate({ businessId: 'biz_clearday', save: true }))

    await waitFor(() => expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true))
  })
})
