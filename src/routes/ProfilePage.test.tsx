import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetInterestsSync } from '@/features/interests/use-interests'
import type * as MockUtils from '@/services/mock/utils'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { profileService } from '@/services/profile.service'
import { renderRoute } from '@/test/render'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

beforeEach(() => {
  localStorage.clear()
  resetInterestsSync()
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
})

describe('Profile page interests', () => {
  it('shows the saved picks and saves a change', async () => {
    await profileService.updateMyInterests(['cat_salon'])
    const { user } = renderRoute('/account')
    expect(await screen.findByRole('heading', { name: 'What you’re here for' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Salon', pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nails', pressed: false }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salon and Nails first')
    await waitFor(async () =>
      expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_salon', 'cat_nails']),
    )
  })

  it('clearing every pick reads as everything', async () => {
    await profileService.updateMyInterests(['cat_salon'])
    const { user } = renderRoute('/account')
    await user.click(await screen.findByRole('button', { name: 'Salon', pressed: true }))
    expect(await screen.findByRole('status')).toHaveTextContent('Showing everything')
  })
})
