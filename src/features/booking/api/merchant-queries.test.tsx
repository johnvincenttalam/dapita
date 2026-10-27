import { focusManager, QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createQueryClient } from '@/lib/query-client'
import { useBusinessBookingsQuery, useRefetchAtNextExpiry } from '@/features/booking/api/merchant-queries'
import { bookingsService } from '@/services/bookings.service'
import type { BookingDetails } from '@/types/booking'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  focusManager.setFocused(undefined)
})

describe('useBusinessBookingsQuery', () => {
  // Expiry is applied on reads, so coming back to the tab must re-read the list.
  it('refetches when the window regains focus, despite the app-wide default', async () => {
    const list = vi.spyOn(bookingsService, 'listBusinessBookings').mockResolvedValue([])
    const queryClient: QueryClient = createQueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useBusinessBookingsQuery('biz_good_cut'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(list).toHaveBeenCalledTimes(1)

    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})

describe('useRefetchAtNextExpiry', () => {
  // So a request leaves the screen as its deadline passes, not only on the next visit.
  it('re-reads the list a second after the soonest deadline', () => {
    vi.useFakeTimers()
    const now = Date.now()
    const pending = { status: 'pending', respondBy: new Date(now + 30 * 60_000).toISOString() } as BookingDetails
    const refetch = vi.fn()
    renderHook(() => useRefetchAtNextExpiry([pending], refetch))

    vi.advanceTimersByTime(30 * 60_000)
    expect(refetch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
