import type { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { accountKeys } from '@/features/account/api/queries'
import { sessionKeys } from '@/features/auth/api/queries'
import { INTERESTS_STORAGE_KEY, useLocalInterests } from '@/features/interests/interests-store'
import { useInterests } from '@/features/interests/use-interests'
import { ApiError } from '@/lib/api-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { profileService } from '@/services/profile.service'
import type { CustomerInterests } from '@/types/account'
import { createTestQueryClient, createTestWrapper } from '@/test/render'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

beforeEach(() => {
  localStorage.clear()
  useLocalInterests.getState().clear()
})

function signIn() {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
}

function renderInterests() {
  const queryClient = createTestQueryClient()
  return { queryClient, ...renderHook(() => useInterests(), { wrapper: createTestWrapper(queryClient) }) }
}

function cachedIds(queryClient: QueryClient) {
  return queryClient.getQueryData<CustomerInterests>(accountKeys.interests())?.categoryIds
}

const realUpdate = profileService.updateMyInterests

/** Holds every save until `settle(n)` is called: with an error it fails, without one it saves for real. */
function holdSaves() {
  const gates: Array<(error?: Error) => void> = []
  const update = vi
    .spyOn(profileService, 'updateMyInterests')
    .mockImplementation((categoryIds) =>
      new Promise<void>((resolve, reject) => gates.push((error) => (error ? reject(error) : resolve()))).then(() =>
        realUpdate(categoryIds),
      ),
    )
  return { update, settle: (call: number, error?: Error) => gates[call]!(error) }
}

function storedInterests(): CustomerInterests {
  const stored = JSON.parse(localStorage.getItem(INTERESTS_STORAGE_KEY)!) as { state: { interests: CustomerInterests } }
  return stored.state.interests
}

describe('useInterests', () => {
  it('a guest starts unanswered and saves to the browser', async () => {
    const { result } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.answered).toBe(false)
    expect(result.current.interests.categoryIds).toEqual([])

    act(() => result.current.setCategoryIds(['cat_barber']))

    expect(result.current.interests.categoryIds).toEqual(['cat_barber'])
    expect(result.current.answered).toBe(true)
    expect(storedInterests().categoryIds).toEqual(['cat_barber'])
  })

  it('junk in storage counts as unanswered', async () => {
    localStorage.setItem(INTERESTS_STORAGE_KEY, '{nope')
    await useLocalInterests.persist.rehydrate()
    expect(useLocalInterests.getState().interests).toEqual({ categoryIds: [] })

    useLocalInterests.getState().set(['cat_barber'])
    localStorage.setItem(
      INTERESTS_STORAGE_KEY,
      JSON.stringify({ state: { interests: { categoryIds: 'cat_barber' } }, version: 0 }),
    )
    await useLocalInterests.persist.rehydrate()

    const { result } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.answered).toBe(false)
    expect(result.current.interests.categoryIds).toEqual([])
  })

  it('a signed-in customer reads and writes the account', async () => {
    signIn()
    const update = vi.spyOn(profileService, 'updateMyInterests')
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.answered).toBe(false)

    act(() => result.current.setCategoryIds(['cat_nails']))

    // Optimistic: the cache holds the pick before the request is sent.
    expect(cachedIds(queryClient)).toEqual(['cat_nails'])
    expect(update).not.toHaveBeenCalled()
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_nails']))
    expect(result.current.answered).toBe(true)
    await waitFor(async () => expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_nails']))
    expect(useLocalInterests.getState().interests.answeredAt).toBeUndefined()
  })

  it('copies a guest answer onto a fresh account once and clears the browser copy', async () => {
    useLocalInterests.getState().set(['cat_barber'])
    signIn()
    const update = vi.spyOn(profileService, 'updateMyInterests')

    const { result } = renderInterests()

    await waitFor(() => expect(useLocalInterests.getState().interests.answeredAt).toBeUndefined())
    expect(result.current.interests.categoryIds).toEqual(['cat_barber'])
    expect(result.current.answered).toBe(true)
    expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_barber'])
    expect(storedInterests().answeredAt).toBeUndefined()
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(['cat_barber'])
  })

  it('leaves the guest answer for the next visit when copying it fails', async () => {
    useLocalInterests.getState().set(['cat_barber'])
    signIn()
    const update = vi
      .spyOn(profileService, 'updateMyInterests')
      .mockRejectedValueOnce(new ApiError('Could not save.', 500))
    const read = vi.spyOn(profileService, 'getMyInterests')

    const { result } = renderInterests()

    // The failure refetches the account answer, which is still unanswered; no second try.
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.answered).toBe(false))
    expect(update).toHaveBeenCalledTimes(1)
    expect(useLocalInterests.getState().interests.categoryIds).toEqual(['cat_barber'])
  })

  it('keeps the account answer when both are answered', async () => {
    signIn()
    await profileService.updateMyInterests(['cat_salon'])
    useLocalInterests.getState().set(['cat_barber'])
    const update = vi.spyOn(profileService, 'updateMyInterests')

    const { result } = renderInterests()

    await waitFor(() => expect(useLocalInterests.getState().interests.answeredAt).toBeUndefined())
    expect(result.current.interests.categoryIds).toEqual(['cat_salon'])
    expect(result.current.answered).toBe(true)
    expect(update).not.toHaveBeenCalled()
  })

  it('sign-out leaves a fresh guest', async () => {
    signIn()
    await profileService.updateMyInterests(['cat_salon'])
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_salon']))

    act(() => {
      localStorage.removeItem(MOCK_SESSION_KEY)
      queryClient.setQueryData(sessionKeys.current, null)
    })

    await waitFor(() => expect(result.current.answered).toBe(false))
    expect(result.current.interests.categoryIds).toEqual([])
  })

  it('the last of two quick taps wins even when the first fails late', async () => {
    signIn()
    const { update, settle } = holdSaves()
    const read = vi.spyOn(profileService, 'getMyInterests')
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))

    act(() => result.current.setCategoryIds(['cat_barber']))
    await waitFor(() => expect(update).toHaveBeenCalledWith(['cat_barber']))
    act(() => result.current.setCategoryIds(['cat_barber', 'cat_nails']))

    expect(cachedIds(queryClient)).toEqual(['cat_barber', 'cat_nails'])
    // One request at a time: the second waits for the first to settle.
    expect(update).toHaveBeenCalledTimes(1)

    act(() => settle(0, new ApiError('Could not save.', 500)))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(update).toHaveBeenLastCalledWith(['cat_barber', 'cat_nails'])
    // The first failure is ignored: no rollback, no refetch.
    expect(cachedIds(queryClient)).toEqual(['cat_barber', 'cat_nails'])

    act(() => settle(1))
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    expect(result.current.interests.categoryIds).toEqual(['cat_barber', 'cat_nails'])
    expect(read).toHaveBeenCalledTimes(1)
    expect((await profileService.getMyInterests()).categoryIds).toEqual(['cat_barber', 'cat_nails'])
  })

  it('an earlier pick that saves late does not replace a later one', async () => {
    signIn()
    const { update, settle } = holdSaves()
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))

    act(() => result.current.setCategoryIds(['cat_barber']))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    act(() => result.current.setCategoryIds(['cat_nails']))

    act(() => settle(0))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(cachedIds(queryClient)).toEqual(['cat_nails'])

    act(() => settle(1))
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    expect(result.current.interests.categoryIds).toEqual(['cat_nails'])
  })

  it('reverts to the account answer when the latest pick fails', async () => {
    signIn()
    await profileService.updateMyInterests(['cat_salon'])
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_salon']))
    vi.spyOn(profileService, 'updateMyInterests').mockRejectedValueOnce(new ApiError('Could not save.', 500))

    act(() => result.current.setCategoryIds(['cat_nails']))
    expect(cachedIds(queryClient)).toEqual(['cat_nails'])

    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_salon']))
  })

  it('reports an error instead of asking when the account answer cannot load', async () => {
    signIn()
    vi.spyOn(profileService, 'getMyInterests').mockRejectedValue(new ApiError('Something went wrong.', 500))

    const { result } = renderInterests()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isPending).toBe(false)
    expect(result.current.answered).toBe(false)
  })
})
