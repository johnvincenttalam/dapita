import { businessProfileSchema, policiesSchema } from '@/schemas/business'
import type { Business, Service } from '@/types/business'

/** The onboarding steps that collect something; the review step checks them all. */
export type OnboardingStep = 'details' | 'hours' | 'services' | 'policies'

export interface ChecklistItem {
  step: OnboardingStep
  label: string
  done: boolean
  /** What to do, in a sentence, when not done. */
  missing?: string
}

/** "a, b and c" */
function listOf(parts: string[]) {
  return parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

function detailsMissing(business: Business) {
  const parts: string[] = []
  if (!businessProfileSchema.shape.name.safeParse(business.name).success) parts.push('a business name')
  if (!businessProfileSchema.shape.description.safeParse(business.description).success) parts.push('a description')
  if (!business.categoryIds.length) parts.push('a category')
  if (!business.areaId) parts.push('an area')
  if (!business.address.trim()) parts.push('an address')
  return parts.length ? `Add ${listOf(parts)}.` : undefined
}

/**
 * What a listing needs before it can go to review (MER-01). The server checks the same
 * rules on submit; this drives the onboarding steps and the review screen.
 */
export function listingChecklist(business: Business, services: Service[]): { items: ChecklistItem[]; ready: boolean } {
  const details = detailsMissing(business)
  const open = Object.values(business.hours).some((ranges) => ranges.length > 0)
  const visible = services.some((service) => service.active)
  const policies = policiesSchema.shape.cancellation.safeParse(business.policies.cancellation).success
  const items: ChecklistItem[] = [
    { step: 'details', label: 'Business details', done: !details, missing: details },
    {
      step: 'hours',
      label: 'Opening hours',
      done: open,
      missing: open ? undefined : 'Open on at least one day of the week.',
    },
    {
      step: 'services',
      label: 'Services',
      done: visible,
      missing: visible ? undefined : 'Show at least one service to customers.',
    },
    {
      step: 'policies',
      label: 'Cancellation policy',
      done: policies,
      missing: policies ? undefined : 'Explain your cancellation rules.',
    },
  ]
  return { items, ready: items.every((item) => item.done) }
}
