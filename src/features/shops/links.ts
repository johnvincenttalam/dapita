/** URLs for a shop's public pages, kept in one place so cards, rows and pages agree. */
export const shopHref = (shopSlug: string) => `/shops/${encodeURIComponent(shopSlug)}`

export const serviceHref = (shopSlug: string, serviceId: string) =>
  `${shopHref(shopSlug)}/services/${encodeURIComponent(serviceId)}`

/** The booking flow, optionally with a service preselected. */
export const bookingHref = (shopSlug: string, serviceId?: string) =>
  `${shopHref(shopSlug)}/book${serviceId ? `?service=${encodeURIComponent(serviceId)}` : ''}`

/** Google Maps directions to a place. A plain link, so turn-by-turn needs no API key; the in-page map is `MapView`. */
export const directionsHref = (destination: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
