import { market } from '@/config/market'
import { env } from '@/lib/env'
import type { ServiceCategory } from '@/types/catalog'

// Ready-made wording for new owners, so no setup step starts from an empty box.
// Everything here fills an ordinary field that the owner can still edit.

export interface ServiceSuggestion {
  name: string
  durationMinutes: number
}

/** Common services per subcategory, with a typical length. Prices are left to the owner. */
const serviceSuggestions: Record<string, ServiceSuggestion[]> = {
  sub_haircut: [
    { name: 'Men’s Haircut', durationMinutes: 30 },
    { name: 'Kids’ Haircut', durationMinutes: 30 },
    { name: 'Haircut & Shampoo', durationMinutes: 45 },
  ],
  sub_beard: [
    { name: 'Beard Trim', durationMinutes: 15 },
    { name: 'Hot Towel Shave', durationMinutes: 30 },
  ],
  sub_styling: [
    { name: 'Women’s Haircut', durationMinutes: 45 },
    { name: 'Blow-dry & Style', durationMinutes: 45 },
  ],
  sub_color: [
    { name: 'Hair Color', durationMinutes: 120 },
    { name: 'Highlights', durationMinutes: 150 },
  ],
  sub_treatment: [
    { name: 'Hair Spa', durationMinutes: 60 },
    { name: 'Keratin Treatment', durationMinutes: 180 },
    { name: 'Rebond', durationMinutes: 240 },
  ],
  sub_massage: [
    { name: 'Swedish Massage', durationMinutes: 60 },
    { name: 'Foot Massage', durationMinutes: 30 },
  ],
  sub_facial: [{ name: 'Classic Facial', durationMinutes: 60 }],
  sub_scrub: [{ name: 'Body Scrub', durationMinutes: 60 }],
  sub_manicure: [
    { name: 'Manicure', durationMinutes: 30 },
    { name: 'Gel Manicure', durationMinutes: 60 },
  ],
  sub_pedicure: [
    { name: 'Pedicure', durationMinutes: 45 },
    { name: 'Foot Spa', durationMinutes: 60 },
  ],
  sub_nail_art: [{ name: 'Nail Art', durationMinutes: 60 }],
  sub_event_makeup: [{ name: 'Event Makeup', durationMinutes: 60 }],
  sub_bridal: [{ name: 'Bridal Makeup', durationMinutes: 120 }],
  sub_facial_care: [{ name: 'Deep Cleansing Facial', durationMinutes: 60 }],
  sub_skin_treatment: [{ name: 'Diamond Peel', durationMinutes: 45 }],
  sub_brows: [
    { name: 'Eyebrow Threading', durationMinutes: 15 },
    { name: 'Brow Shaping', durationMinutes: 30 },
  ],
  sub_lashes: [
    { name: 'Lash Extensions', durationMinutes: 90 },
    { name: 'Lash Lift', durationMinutes: 60 },
  ],
  sub_hilot: [{ name: 'Traditional Hilot', durationMinutes: 60 }],
  sub_reflexology: [{ name: 'Foot Reflexology', durationMinutes: 45 }],
}

/** Suggestions for the categories a shop can use, minus any service it already has by that name. */
export function suggestServices(categories: ServiceCategory[], existingNames: string[]) {
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()))
  return categories.flatMap((category) =>
    (serviceSuggestions[category.id] ?? [])
      .filter((suggestion) => !taken.has(suggestion.name.toLowerCase()))
      .map((suggestion) => ({ ...suggestion, categoryId: category.id })),
  )
}

/** Usual appointment lengths, offered as one tap each; anything else is typed. */
export const commonDurations = [15, 30, 45, 60, 90, 120] as const

export interface PolicySuggestion {
  label: string
  text: string
}

export const cancellationSuggestions: PolicySuggestion[] = [
  {
    label: 'Free up to 2 hours before',
    text: 'You can cancel for free up to 2 hours before your appointment. If you need to cancel later than that, please message us as soon as you can.',
  },
  {
    label: 'Free up to 1 day before',
    text: 'You can cancel for free up to 24 hours before your appointment. If you need to cancel later than that, please message us as soon as you can.',
  },
  {
    label: 'Free any time',
    text: 'You can cancel any time before your appointment. Please tell us as early as you can, so we can offer the slot to another customer.',
  },
]

export const noShowSuggestions: PolicySuggestion[] = [
  {
    label: 'Give the slot away after 15 minutes',
    text: 'If you’re more than 15 minutes late, we may give your slot to the next customer.',
  },
  {
    label: 'Ask for a deposit next time',
    text: 'If you miss an appointment without telling us, we may ask for a deposit before your next booking.',
  },
]

export const depositSuggestions: PolicySuggestion[] = [
  {
    label: 'Deposit by GCash for long appointments',
    text: 'For long appointments, we may ask for a deposit by GCash to hold your slot. We’ll message you the amount before we confirm, and it counts toward your bill.',
  },
]

/** How a category reads in "X is a … in Area", and what such a shop usually offers. */
const shopKinds: Record<string, { noun: string; offer: string }> = {
  cat_barber: { noun: 'barbershop', offer: 'We do haircuts, fades and shaves for men and kids.' },
  cat_salon: { noun: 'hair salon', offer: 'We do haircuts, color and hair treatments.' },
  cat_spa: { noun: 'spa', offer: 'Come in for a massage, a facial or a body scrub.' },
  cat_nails: { noun: 'nail salon', offer: 'We do manicures, pedicures and nail art.' },
  cat_makeup: { noun: 'makeup studio', offer: 'We do makeup for events, photo shoots and weddings.' },
  cat_skin: { noun: 'skin care clinic', offer: 'We offer facials and skin treatments.' },
  cat_brows: { noun: 'brow and lash studio', offer: 'We shape brows and do lash lifts and extensions.' },
  cat_wellness: { noun: 'wellness center', offer: 'We offer hilot, reflexology and other traditional treatments.' },
}

/**
 * A first draft of the shop's description from what the owner has already chosen,
 * for them to make their own. Undefined until a category is picked.
 */
export function suggestDescription({
  name,
  categoryIds,
  areaName,
}: {
  name: string
  categoryIds: string[]
  areaName?: string
}): string | undefined {
  const kinds = categoryIds.map((id) => shopKinds[id]).filter((kind) => kind !== undefined)
  const first = kinds[0]
  if (!first) return undefined
  const shop = name.trim() || 'Our shop'
  const article = /^[aeiou]/i.test(first.noun) ? 'an' : 'a'
  const place = areaName ? `${areaName}, ${market.city}` : market.city
  return [
    `${shop} is ${article} ${first.noun} in ${place}.`,
    ...kinds.map((kind) => kind.offer),
    `Send us a booking request on ${env.appName} and we’ll confirm your time.`,
  ].join(' ')
}
