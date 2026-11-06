import type { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { accountKeys } from '@/features/account/api/queries'
import { sessionKeys, useSession } from '@/features/auth/api/queries'
import { resetInterestsSync, useInterests } from '@/features/interests/use-interests'
import { ApiError } from '@/lib/api-client'
import { createQueryClient } from '@/lib/query-client'
import { MOCK_SESSION_KEY, mockUsers } from '@/services/mock/users'
import { profileService } from '@/services/profile.service'
import type { CustomerInterests } from '@/types/account'
import type { ID } from '@/types/common'
import { createTestQueryClient, createTestWrapper } from '@/test/render'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

beforeEach(() => {
  localStorage.clear()
  resetInterestsSync()
})

function signIn() {
  localStorage.setItem(MOCK_SESSION_KEY, mockUsers.customer.id)
}

/** Pass the app's own client to get its global toasts. */
function renderInterests(queryClient = createTestQueryClient()) {
  const hook = renderHook(() => useInterests(), { wrapper: createTestWrapper(queryClient) })
  return { queryClient, ...hook }
}

/** Lets queued promise chains run to the end. */
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 10)))

/** A user's answer in the cache; the signed-in customer's by default. */
function cachedIds(queryClient: QueryClient, userId: ID | null = mockUsers.customer.id) {
  return queryClient.getQueryData<CustomerInterests>(accountKeys.interests(userId))?.categoryIds
}

const realUpdate = profileService.updateMyInterests

/** Every save reaches the server at once, but its response waits for `settle(n)`; with an error it fails. */
function holdSaves() {
  const gates: Array<(error?: Error) => void> = []
  const update = vi.spyOn(profileService, 'updateMyInterests').mockImplementation((categoryIds) => {
    const saved = realUpdate(categoryIds)
    return new Promise<void>((resolve, reject) => gates.push((error) => (error ? reject(error) : resolve()))).then(
      () => saved,
    )
  })
  return { update, settle: (call: number, error?: Error) => gates[call]!(error) }
}

function signOut(queryClient: QueryClient) {
  act(() => {
    localStorage.removeItem(MOCK_SESSION_KEY)
    queryClient.setQueryData(sessionKeys.current, null)
  })
}

describe('useInterests', () => {
  it('a signed-out viewer reads unanswered and cannot save', async () => {
    const update = vi.spyOn(profileService, 'updateMyInterests')
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.interests).toEqual({ categoryIds: [] })
    expect(result.current.answered).toBe(false)
    act(() => result.current.setCategoryIds(['cat_barber']))
    await flush()
    expect(update).not.toHaveBeenCalled()
    expect(cachedIds(queryClient, null)).toBeUndefined()
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
  })

  it('sign-out leaves a fresh guest', async () => {
    signIn()
    await profileService.updateMyInterests(['cat_salon'])
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_salon']))

    signOut(queryClient)

    await waitFor(() => expect(result.current.answered).toBe(false))
    expect(result.current.interests.categoryIds).toEqual([])
  })

  it('signing in as someone else shows their answer, not the previous account', async () => {
    localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
    await profileService.updateMyInterests(['cat_barber'])
    signIn()
    await profileService.updateMyInterests(['cat_salon'])
    // Every render, with whose session it was.
    const seen: Array<{ userId?: ID; categoryIds: ID[] }> = []
    const queryClient = createTestQueryClient()
    const { result } = renderHook(
      () => {
        const state = useInterests()
        seen.push({ userId: useSession().user?.id, categoryIds: state.interests.categoryIds })
        return state
      },
      { wrapper: createTestWrapper(queryClient) },
    )
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_salon']))

    act(() => {
      localStorage.setItem(MOCK_SESSION_KEY, mockUsers.merchant.id)
      queryClient.setQueryData(sessionKeys.current, mockUsers.merchant)
    })

    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_barber']))
    expect(result.current.answered).toBe(true)
    const merchantRenders = seen.filter((render) => render.userId === mockUsers.merchant.id)
    expect(merchantRenders.length).toBeGreaterThan(0)
    expect(merchantRenders.map((render) => render.categoryIds)).not.toContainEqual(['cat_salon'])
  })

  it('drops saves that were waiting when the customer signs out', async () => {
    signIn()
    const { update, settle } = holdSaves()
    const { result, queryClient } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))
    act(() => result.current.setCategoryIds(['cat_barber']))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    act(() => result.current.setCategoryIds(['cat_nails']))

    signOut(queryClient)
    act(() => settle(0))
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    await flush()

    // The queued pick is never sent, and the late response leaves nothing behind for the next person.
    expect(update).toHaveBeenCalledTimes(1)
    expect(cachedIds(queryClient)).toBeUndefined()
    expect(result.current.answered).toBe(false)
  })

  it('the last of two quick taps wins even when the first fails late', async () => {
    signIn()
    const { update, settle } = holdSaves()
    const read = vi.spyOn(profileService, 'getMyInterests')
    const toastError = vi.spyOn(toast, 'error')
    const { result, queryClient } = renderInterests(createQueryClient())
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
    // The first failure is ignored: no rollback, no refetch, no toast.
    expect(cachedIds(queryClient)).toEqual(['cat_barber', 'cat_nails'])

    act(() => settle(1))
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    expect(result.current.interests.categoryIds).toEqual(['cat_barber', 'cat_nails'])
    expect(read).toHaveBeenCalledTimes(1)
    expect(toastError).not.toHaveBeenCalled()
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

  it('reverts to the confirmed answer and says so once when the latest pick fails', async () => {
    signIn()
    await profileService.updateMyInterests(['cat_salon'])
    const read = vi.spyOn(profileService, 'getMyInterests')
    const toastError = vi.spyOn(toast, 'error')
    const { result, queryClient } = renderInterests(createQueryClient())
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_salon']))
    vi.spyOn(profileService, 'updateMyInterests').mockRejectedValueOnce(new ApiError('Could not save.', 500))

    act(() => result.current.setCategoryIds(['cat_nails']))
    expect(cachedIds(queryClient)).toEqual(['cat_nails'])

    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    await waitFor(() => expect(result.current.interests.categoryIds).toEqual(['cat_salon']))
    // Restored from the last confirmed answer, without asking the server again.
    expect(read).toHaveBeenCalledTimes(1)
    expect(toastError).toHaveBeenCalledTimes(1)
    expect(toastError).toHaveBeenCalledWith('Could not save.')
  })

  it('keeps setCategoryIds stable across renders', async () => {
    signIn()
    const { result, rerender } = renderInterests()
    await waitFor(() => expect(result.current.isPending).toBe(false))
    const { setCategoryIds } = result.current

    rerender()

    expect(result.current.setCategoryIds).toBe(setCategoryIds)
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
