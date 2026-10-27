/**
 * The launch market. The documentation scopes the MVP to one city, so this is
 * configuration rather than user-selectable data.
 */
export const market = {
  city: 'Davao City',
  country: 'Philippines',
  /** Every date and time is displayed in this zone (doc §7.3). */
  timeZone: 'Asia/Manila',
  locale: 'en-PH',
  currency: 'PHP',
} as const
