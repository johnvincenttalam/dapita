import { screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { RecommendedRow } from '@/features/recommendations/components/RecommendedRow'
import { ApiError } from '@/lib/api-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { recommendationsService } from '@/services/recommendations.service'
import { renderWithProviders } from '@/test/render'
import type { Coordinates } from '@/types/common'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

/** Near Bajada, a few hundred metres from Clearday Skin. */
const bajada: Coordinates = { lat: 7.0927, lng: 125.6117 }

function renderRow(props: { position?: Coordinates; showError?: boolean } = {}) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <RecommendedRow title="Recommended near you" headingId="recommended-heading" {...props} />,
    },
  ])
  return renderWithProviders(<RouterProvider router={router} />)
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
})

describe('RecommendedRow', () => {
  it('shows up to 8 cards with their tags and distances', async () => {
    renderRow({ position: bajada })
    const list = await screen.findByRole('list', { name: 'Recommended near you' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThanOrEqual(8)
    const clearday = cards.find((card) => within(card).queryByRole('link', { name: /Clearday/ }))
    expect(clearday).toBeDefined()
    expect(within(clearday!).getByText('Customers like you')).toBeInTheDocument()
    expect(within(clearday!).getByText(/\d+(\.\d)? (m|km)$/)).toBeInTheDocument()
  })

  it('shows nothing when the list is empty', async () => {
    const list = vi.spyOn(recommendationsService, 'listRecommendations').mockResolvedValue([])
    renderRow({ position: bajada, showError: true })
    await waitFor(() => expect(list).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('Recommended near you')).not.toBeInTheDocument())
  })

  it('shows a retryable error only when showError is set', async () => {
    vi.spyOn(recommendationsService, 'listRecommendations').mockRejectedValue(new ApiError('Server down', 500))
    const { unmount } = renderRow({ position: bajada, showError: true })
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    unmount()

    renderRow({ position: bajada })
    await waitFor(() => expect(recommendationsService.listRecommendations).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})
