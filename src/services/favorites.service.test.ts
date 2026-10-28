import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { favoritesService } from '@/services/favorites.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

function signInAs(account: MockAccount | null) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  else localStorage.removeItem(MOCK_SESSION_KEY)
}

const savedIds = async () => (await favoritesService.listMyFavorites()).map((shop) => shop.id)

beforeEach(() => {
  localStorage.clear()
})

describe('favorites (mock service)', () => {
  it('requires a customer account', async () => {
    await expect(favoritesService.listMyFavorites()).rejects.toMatchObject({ status: 401 })
    signInAs('admin')
    await expect(favoritesService.saveFavorite('biz_glow_go')).rejects.toMatchObject({ status: 403 })
  })

  it('saves shops newest first, ignores a second save and removes them', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    signInAs('customer')
    expect(await savedIds()).toEqual([])

    vi.setSystemTime(new Date('2026-10-21T03:00:00Z'))
    await favoritesService.saveFavorite('biz_good_cut')
    vi.setSystemTime(new Date('2026-10-21T03:01:00Z'))
    await favoritesService.saveFavorite('biz_glow_go')
    await favoritesService.saveFavorite('biz_good_cut')
    vi.useRealTimers()

    const saved = await favoritesService.listMyFavorites()
    expect(saved.map((shop) => shop.id)).toEqual(['biz_glow_go', 'biz_good_cut'])
    expect(saved[1]).toMatchObject({ name: 'The Good Cut Barbershop', slug: 'the-good-cut-barbershop' })

    await favoritesService.removeFavorite('biz_good_cut')
    await favoritesService.removeFavorite('biz_good_cut')
    expect(await savedIds()).toEqual(['biz_glow_go'])
  })

  it('keeps each customer’s list private', async () => {
    signInAs('customer')
    await favoritesService.saveFavorite('biz_glow_go')
    signInAs('merchant')
    expect(await savedIds()).toEqual([])
  })

  it('refuses shops that aren’t public and the owner’s own business', async () => {
    signInAs('customer')
    await expect(favoritesService.saveFavorite('biz_kulot')).rejects.toMatchObject({ status: 404 })
    signInAs('merchant')
    await expect(favoritesService.saveFavorite('biz_good_cut')).rejects.toMatchObject({
      status: 422,
      message: 'You can’t save your own business.',
    })
  })
})
