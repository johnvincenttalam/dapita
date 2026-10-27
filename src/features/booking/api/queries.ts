import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { bookingsService, type CreateBookingInput } from '@/services/bookings.service'
import type { BookingDetails } from '@/types/booking'

/** Query keys for the signed-in customer's bookings. */
export const bookingKeys = {
  all: ['bookings'] as const,
  mine: () => [...bookingKeys.all, 'mine'] as const,
  detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
}

export function useMyBookingsQuery({ enabled = true } = {}) {
  return useQuery({ queryKey: bookingKeys.mine(), queryFn: bookingsService.listMyBookings, enabled })
}

export function useBookingQuery(id: string) {
  return useQuery({ queryKey: bookingKeys.detail(id), queryFn: () => bookingsService.getBooking(id) })
}

/** Stores the server's copy of a changed booking and refreshes the list. */
function useBookingUpdated() {
  const queryClient = useQueryClient()
  return (booking: BookingDetails) => {
    queryClient.setQueryData(bookingKeys.detail(booking.id), booking)
    return queryClient.invalidateQueries({ queryKey: bookingKeys.mine() })
  }
}

export function useCreateBookingMutation() {
  const onUpdated = useBookingUpdated()
  return useMutation({
    mutationFn: (input: CreateBookingInput) => bookingsService.createBooking(input),
    // The form shows the error next to the submit button.
    meta: { showErrorToast: false },
    onSuccess: onUpdated,
  })
}

export function useCancelBookingMutation() {
  const onUpdated = useBookingUpdated()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => bookingsService.cancelBooking(id, reason),
    meta: { successMessage: 'Booking cancelled' },
    onSuccess: onUpdated,
  })
}

export function useAcceptAlternativeMutation() {
  const onUpdated = useBookingUpdated()
  return useMutation({
    mutationFn: (id: string) => bookingsService.acceptAlternative(id),
    meta: { successMessage: 'New time accepted. Your booking is confirmed.' },
    onSuccess: onUpdated,
  })
}

export function useDeclineAlternativeMutation() {
  const onUpdated = useBookingUpdated()
  return useMutation({
    mutationFn: (id: string) => bookingsService.declineAlternative(id),
    meta: { successMessage: 'Your original time was sent back to the shop' },
    onSuccess: onUpdated,
  })
}
