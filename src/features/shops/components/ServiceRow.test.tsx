import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ServiceRow } from '@/features/shops/components/ServiceRow'
import type { Service } from '@/types/business'

const service: Service = {
  id: 'svc_1',
  businessId: 'biz_1',
  categoryId: 'sub_haircut',
  name: 'Hot Towel Shave',
  price: { type: 'fixed', amount: 200 },
  durationMinutes: 30,
  bufferMinutes: 0,
  featured: false,
  active: true,
  sortOrder: 1,
  photo: { url: '/api/uploads/services/svc_1/ph_1-1280.webp', srcSet: '/a-320.webp 320w, /a-640.webp 640w' },
}

describe('ServiceRow', () => {
  it('shows the photo with its smaller copies and keeps it decorative', () => {
    render(
      <MemoryRouter>
        <ServiceRow service={service} shopSlug="the-good-cut-barbershop" />
      </MemoryRouter>,
    )
    const image = screen.getByRole('presentation')
    expect(image).toHaveAttribute('src', service.photo!.url)
    expect(image).toHaveAttribute('srcset', service.photo!.srcSet)
    expect(image).toHaveAttribute('sizes', '64px')
  })
})
