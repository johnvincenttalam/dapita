import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useSession } from '@/features/auth/api/queries'
import { bookingKeys } from '@/features/booking/api/queries'
import { msUntilNextExpiry } from '@/lib/merchant-bookings'
import { bookingsService, type MerchantResponse } from '@/services/bookings.service'
import type { BookingDetails } from '@/types/booking'

/** Query keys for the merchant's view of bookings, under `bookingKeys.all` so one invalidation covers both sides. */
export const merchantBookingKeys = {
  business: (businessId: string) => [...bookingKeys.all, 'business', businessId] as const,
  detail: (id: string) => [...bookingKeys.all, 'merchant-detail', id] as const,
}

// Requests expire on read (the mock runs expiry on every query), so coming back to the tab re-reads them
// even though the app-wide default turns window-focus refetching off.
const refetchOnWindowFocus = 'always' as const

/** MVP: one business per owner (plan §11.2 #13), as in `MerchantLayout`. */
export function useCurrentBusinessId(): string | undefined {
  const { user } = useSession()
  return user?.memberships[0]?.businessId
}

export function useBusinessBookingsQuery(businessId: string | undefined) {
  return useQuery({
    queryKey: merchantBookingKeys.business(businessId ?? ''),
    queryFn: () => bookingsService.listBusinessBookings(businessId ?? ''),
    enabled: Boolean(businessId),
    refetchOnWindowFocus,
  })
}

export function useBusinessBookingQuery(id: string | undefined) {
  return useQuery({
    queryKey: merchantBookingKeys.detail(id ?? ''),
    queryFn: () => bookingsService.getBusinessBooking(id ?? ''),
    enabled: Boolean(id),
    refetchOnWindowFocus,
  })
}

/** Re-reads the list when the next open request reaches its deadline, so it leaves the screen as it expires. */
export function useRefetchAtNextExpiry(bookings: BookingDetails[] | undefined, refetch: () => unknown) {
  useEffect(() => {
    const wait = msUntilNextExpiry(bookings ?? [], new Date())
    if (wait === undefined) return
    // A second's grace so the server agrees it has expired; capped to stay within setTimeout's range.
    const timer = window.setTimeout(() => void refetch(), Math.min(wait + 1000, 2 ** 31 - 1))
    return () => window.clearTimeout(timer)
  }, [bookings, refetch])
}

/** Accept, decline or propose. Callers show their own success toast, since it names the customer. */
export function useRespondToBookingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: MerchantResponse }) =>
      bookingsService.respondToBooking(id, response),
    onSuccess: (booking: BookingDetails) => {
      queryClient.setQueryData(merchantBookingKeys.detail(booking.id), booking)
      return queryClient.invalidateQueries({ queryKey: bookingKeys.all })
    },
  })
}
