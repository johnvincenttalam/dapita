/**
 * The launch market. The documentation scopes the MVP to one city, so this is
 * configuration rather than user-selectable data.
 */
export const market = {
  city: 'Davao City',
  /** City centre, where the map starts before it knows the results or the viewer's location. */
  center: { lat: 7.0731, lng: 125.6128 },
  country: 'Philippines',
  /** Every date and time is displayed in this zone (doc §7.3). */
  timeZone: 'Asia/Manila',
  locale: 'en-PH',
  currency: 'PHP',
} as const
