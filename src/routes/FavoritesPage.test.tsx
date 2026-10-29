import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { useUserLocation } from '@/hooks/use-user-location'
import { favoritesService } from '@/services/favorites.service'
import { seedAreas } from '@/services/mock/seed/catalog'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { renderRoute } from '@/test/render'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

const distance = /^\d+(\.\d)? (m|km)$/
const shopNames = (list: HTMLElement) =>
  within(list)
    .getAllByRole('heading')
    .map((heading) => heading.textContent)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
  useUserLocation.getState().clear()
})

describe('Favorites page suggestions', () => {
  it('shows "You might also like" under the saved shops without any saved shop in it', async () => {
    await favoritesService.saveFavorite('biz_studio_mane')
    useUserLocation.getState().chooseArea(seedAreas.find((area) => area.slug === 'bajada')!)
    renderRoute('/favorites')
    const saved = await screen.findByRole('list', { name: 'Saved shops' })
    const suggestions = await screen.findByRole('list', { name: 'You might also like' })
    const savedNames = shopNames(saved)
    expect(savedNames.length).toBe(1)
    expect(shopNames(suggestions)).not.toContain(savedNames[0])
    expect(within(suggestions).getAllByText(distance).length).toBeGreaterThan(0)
  })

  it('with nothing saved, shows the empty state and the row', async () => {
    renderRoute('/favorites')
    expect(await screen.findByText('No saved shops yet')).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'You might also like' })).toBeInTheDocument()
  })

  it('without a location, links to set one and shows no distances', async () => {
    renderRoute('/favorites')
    const suggestions = await screen.findByRole('list', { name: 'You might also like' })
    expect(within(suggestions).queryAllByText(distance)).toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Set your location' })).toHaveAttribute('href', '/')
  })
})
