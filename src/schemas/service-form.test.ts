import { describe, expect, it } from 'vitest'

import { serviceFormSchema, serviceFormValues, type ServiceFormInput } from '@/schemas/service'
import type { Service } from '@/types/business'

const values = (overrides: Partial<ServiceFormInput> = {}): ServiceFormInput => ({
  name: 'Buzz Cut',
  categoryId: 'sub_haircut',
  priceType: 'fixed',
  amount: '150',
  maxAmount: '',
  durationMinutes: 30,
  description: '',
  requirements: '',
  featured: false,
  active: true,
  ...overrides,
})

const errorAt = (input: ServiceFormInput, path: string) => {
  const result = serviceFormSchema.safeParse(input)
  return result.success ? undefined : result.error.issues.find((issue) => issue.path.join('.') === path)?.message
}

describe('serviceFormSchema', () => {
  it('turns the price fields into a stored price, accepting ₱ and thousands commas', () => {
    expect(serviceFormSchema.parse(values({ amount: '₱1,200' })).price).toEqual({ type: 'fixed', amount: 1200 })
    expect(serviceFormSchema.parse(values({ priceType: 'from', amount: '800' })).price).toEqual({
      type: 'from',
      amount: 800,
    })
    expect(serviceFormSchema.parse(values({ priceType: 'range', amount: '800', maxAmount: '1500' })).price).toEqual({
      type: 'range',
      amount: 800,
      maxAmount: 1500,
    })
    expect(serviceFormSchema.parse(values({ priceType: 'quote', amount: '' })).price).toEqual({ type: 'quote' })
  })

  it('explains what is wrong with a price', () => {
    expect(errorAt(values({ amount: '' }), 'amount')).toBe('Enter a price')
    expect(errorAt(values({ amount: 'abc' }), 'amount')).toBe('Enter a price')
    expect(errorAt(values({ amount: '99.50' }), 'amount')).toBe('Use whole pesos')
    expect(errorAt(values({ amount: '0' }), 'amount')).toBe('Price must be more than ₱0')
    expect(errorAt(values({ priceType: 'range', amount: '800', maxAmount: '' }), 'maxAmount')).toBe('Enter a price')
    expect(errorAt(values({ priceType: 'range', amount: '800', maxAmount: '500' }), 'maxAmount')).toBe(
      'The highest price must be more than the lowest',
    )
  })

  it('requires a name and a category', () => {
    expect(errorAt(values({ name: '  ' }), 'name')).toBe('Service name is required')
    expect(errorAt(values({ categoryId: '' }), 'categoryId')).toBe('Category is required')
  })
})

describe('serviceFormValues', () => {
  it('fills the form from a saved service', () => {
    const service = {
      id: 'svc_x',
      businessId: 'biz_good_cut',
      categoryId: 'sub_haircut',
      name: 'Men’s Hair Color',
      price: { type: 'range', amount: 800, maxAmount: 1500 },
      durationMinutes: 90,
      bufferMinutes: 10,
      featured: true,
      active: false,
      sortOrder: 5,
    } satisfies Service
    expect(serviceFormValues(service)).toEqual({
      name: 'Men’s Hair Color',
      categoryId: 'sub_haircut',
      priceType: 'range',
      amount: '800',
      maxAmount: '1500',
      durationMinutes: 90,
      description: '',
      requirements: '',
      featured: true,
      active: false,
    })
  })

  it('starts a new service visible, with a 30-minute fixed price', () => {
    expect(serviceFormValues(undefined, 'sub_beard')).toMatchObject({
      categoryId: 'sub_beard',
      priceType: 'fixed',
      amount: '',
      durationMinutes: 30,
      active: true,
      featured: false,
    })
  })
})
