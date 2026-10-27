import { z } from 'zod'

import { requiredString } from '@/schemas/common'
import type { Service, ServicePrice } from '@/types/business'

// Merchant service catalogue (MER-02). Prices are whole pesos.

const MAX_PRICE = 100_000

const amountField = z
  .number({ error: 'Enter a price' })
  .int('Use whole pesos')
  .positive('Price must be more than ₱0')
  .max(MAX_PRICE, 'Price looks too high')

export const servicePriceSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('fixed'), amount: amountField }),
    z.object({ type: z.literal('from'), amount: amountField }),
    z.object({ type: z.literal('range'), amount: amountField, maxAmount: amountField }),
    z.object({ type: z.literal('quote') }),
  ])
  .refine((price) => price.type !== 'range' || price.maxAmount > price.amount, {
    path: ['maxAmount'],
    error: 'The highest price must be more than the lowest',
  })

export const serviceSchema = z.object({
  name: requiredString('Service name').max(80, 'Keep the name to 80 characters or fewer'),
  categoryId: requiredString('Category'),
  description: z.string().trim().max(500, 'Keep the description to 500 characters or fewer'),
  requirements: z.string().trim().max(300, 'Keep this to 300 characters or fewer'),
  price: servicePriceSchema,
  durationMinutes: z
    .number({ error: 'Enter a duration' })
    .int()
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration can’t be more than 8 hours')
    .multipleOf(5, 'Use 5-minute steps'),
  bufferMinutes: z.number().int().min(0).max(120, 'Clean-up time can’t be more than 2 hours'),
  featured: z.boolean(),
  active: z.boolean(),
})

export type ServiceInput = z.infer<typeof serviceSchema>

// ─── Form ────────────────────────────────────────────────────────────────────
// The editor keeps prices as text (so "₱1,200" and an empty field behave) and
// turns them into a `ServicePrice` on submit. Clean-up time is P1 and not edited here.

export const priceTypes = ['fixed', 'from', 'range', 'quote'] as const

/** "₱1,200" → 1200; empty → undefined; anything else → NaN, which the amount check reports. */
const parseAmount = (text: string) => {
  const cleaned = text.replace(/[₱,\s]/g, '')
  return cleaned === '' ? undefined : Number(cleaned)
}

export const serviceFormSchema = z
  .object({
    name: serviceSchema.shape.name,
    categoryId: serviceSchema.shape.categoryId,
    priceType: z.enum(priceTypes),
    amount: z.string(),
    maxAmount: z.string(),
    durationMinutes: serviceSchema.shape.durationMinutes,
    description: serviceSchema.shape.description,
    requirements: serviceSchema.shape.requirements,
    featured: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.priceType === 'quote') return
    const check = (key: 'amount' | 'maxAmount') => {
      const result = amountField.safeParse(parseAmount(values[key]))
      if (!result.success) ctx.addIssue({ code: 'custom', path: [key], message: result.error.issues[0]?.message })
      return result.success ? result.data : undefined
    }
    const amount = check('amount')
    if (values.priceType !== 'range') return
    const maxAmount = check('maxAmount')
    if (amount !== undefined && maxAmount !== undefined && maxAmount <= amount) {
      ctx.addIssue({ code: 'custom', path: ['maxAmount'], message: 'The highest price must be more than the lowest' })
    }
  })
  .transform(({ priceType, amount, maxAmount, ...rest }): Omit<ServiceInput, 'bufferMinutes'> => {
    const min = parseAmount(amount) ?? 0
    const price: ServicePrice =
      priceType === 'quote'
        ? { type: 'quote' }
        : priceType === 'range'
          ? { type: 'range', amount: min, maxAmount: parseAmount(maxAmount) ?? 0 }
          : { type: priceType, amount: min }
    return { ...rest, price }
  })

export type ServiceFormInput = z.input<typeof serviceFormSchema>
export type ServiceFormValues = z.output<typeof serviceFormSchema>

/** The editor's starting values: a saved service, or a new one under `categoryId`. */
export function serviceFormValues(service: Service | undefined, categoryId = ''): ServiceFormInput {
  const price = service?.price
  return {
    name: service?.name ?? '',
    categoryId: service?.categoryId ?? categoryId,
    priceType: price?.type ?? 'fixed',
    amount: price && price.type !== 'quote' ? String(price.amount) : '',
    maxAmount: price?.type === 'range' ? String(price.maxAmount) : '',
    durationMinutes: service?.durationMinutes ?? 30,
    description: service?.description ?? '',
    requirements: service?.requirements ?? '',
    featured: service?.featured ?? false,
    active: service?.active ?? true,
  }
}

/** A saved service as editable input, e.g. to change one field such as `active`. */
export function toServiceInput(service: Service): ServiceInput {
  return {
    name: service.name,
    categoryId: service.categoryId,
    description: service.description ?? '',
    requirements: service.requirements ?? '',
    price: service.price,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    featured: service.featured,
    active: service.active,
  }
}

/** The price as typed so far, for the live "Customers see" line; undefined until it would pass validation. */
export function previewPrice({
  priceType,
  amount,
  maxAmount,
}: Pick<ServiceFormInput, 'priceType' | 'amount' | 'maxAmount'>) {
  if (priceType === 'quote') return { type: 'quote' } satisfies ServicePrice
  const min = amountField.safeParse(parseAmount(amount))
  if (!min.success) return undefined
  if (priceType !== 'range') return { type: priceType, amount: min.data } satisfies ServicePrice
  const max = amountField.safeParse(parseAmount(maxAmount))
  if (!max.success || max.data <= min.data) return undefined
  return { type: 'range', amount: min.data, maxAmount: max.data } satisfies ServicePrice
}
