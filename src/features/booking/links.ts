/** URLs for a customer's bookings. */
export const bookingHref = (id: string) => `/bookings/${encodeURIComponent(id)}`

export const bookingSubmittedHref = (id: string) => `${bookingHref(id)}/submitted`
