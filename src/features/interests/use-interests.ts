import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import { accountKeys, useMyInterestsQuery, useUpdateInterestsMutation } from '@/features/account/api/queries'
import { sessionKeys, useSession } from '@/features/auth/api/queries'
import { getErrorMessage } from '@/lib/api-client'
import type { CustomerInterests } from '@/types/account'
import type { Session } from '@/types/auth'
import type { ID } from '@/types/common'

export interface InterestsState {
  interests: CustomerInterests
  /** True once the account has an answer, even an empty one. */
  answered: boolean
  /** True while the session or the account's answer is still loading. */
  isPending: boolean
  /** True when a signed-in customer's answer could not be loaded; the UI shows nothing. */
  isError: boolean
  /** Saves to the account; does nothing for a guest. */
  setCategoryIds: (categoryIds: ID[]) => void
}

const UNANSWERED: CustomerInterests = { categoryIds: [] }

/**
 * Account writes for one signed-in user, shared by every mounted useInterests so the page
 * sends one request at a time. Replaced when the user changes.
 */
interface AccountSync {
  userId: ID | null
  /** Bumped by every pick; only the request for the latest one may change the cache. */
  seq: number
  /** The requests, one after another. */
  chain: Promise<void>
  /** The latest pick, as written to the cache. */
  latest?: CustomerInterests
  /** What the server last confirmed; a failed pick goes back to it. */
  confirmed?: CustomerInterests
}

let sync: AccountSync = { userId: null, seq: 0, chain: Promise.resolve() }

/** The writes for `userId`. A different user drops the old user's queued and in-flight picks. */
function syncFor(userId: ID | null): AccountSync {
  if (sync.userId !== userId) sync = { userId, seq: sync.seq + 1, chain: sync.chain }
  return sync
}

/** Forgets every queued write. For tests. */
export function resetInterestsSync() {
  sync = { userId: null, seq: 0, chain: Promise.resolve() }
}

type WriteOutcome = { status: 'saved' } | { status: 'superseded' } | { status: 'failed'; error: unknown }

/** Shows the pick at once, then saves it after any request already in flight. */
function writeToAccount(
  queryClient: QueryClient,
  save: (variables: { userId: ID; categoryIds: ID[] }) => Promise<CustomerInterests>,
  userId: ID,
  categoryIds: ID[],
): Promise<WriteOutcome> {
  const state = syncFor(userId)
  const seq = ++state.seq
  const key = accountKeys.interests(userId)
  const current = queryClient.getQueryData<CustomerInterests>(key)
  if (state.latest === undefined && state.confirmed === undefined) state.confirmed = current
  state.latest = { categoryIds, answeredAt: current?.answeredAt ?? new Date().toISOString() }
  queryClient.setQueryData<CustomerInterests>(key, state.latest)

  // Read from the cache, not the render: the session can end before the hook re-renders.
  const userStillHere = () => state === sync && queryClient.getQueryData<Session>(sessionKeys.current)?.id === userId
  const isLatest = () => userStillHere() && seq === state.seq
  const step = state.chain.then(async (): Promise<WriteOutcome> => {
    if (!isLatest()) return { status: 'superseded' } // Replaced before it was sent.
    try {
      const saved = await save({ userId, categoryIds })
      if (userStillHere()) state.confirmed = saved
      if (isLatest()) return { status: 'saved' }
      // Superseded while in flight, and the mutation wrote this older answer to the cache.
      if (userStillHere()) queryClient.setQueryData<CustomerInterests>(key, state.latest)
      else void queryClient.resetQueries({ queryKey: key, exact: true }) // The user has gone.
      return { status: 'superseded' }
    } catch (error) {
      if (!isLatest()) return { status: 'superseded' }
      if (state.confirmed) queryClient.setQueryData<CustomerInterests>(key, state.confirmed)
      else void queryClient.invalidateQueries({ queryKey: key })
      return { status: 'failed', error }
    }
  })
  state.chain = step.then(() => undefined)
  return step
}

/** What the viewer is here for. Signed-in customers keep it on their account; a guest has none. */
export function useInterests(): InterestsState {
  const queryClient = useQueryClient()
  const { user, isPending: isSessionPending } = useSession()
  const userId = user?.id ?? null
  const account = useMyInterestsQuery(userId)
  const { mutateAsync: saveToAccount } = useUpdateInterestsMutation()

  // Signing out or switching user drops the previous user's queued picks.
  useEffect(() => {
    syncFor(userId)
  }, [userId])

  const setCategoryIds = useCallback(
    (categoryIds: ID[]) => {
      if (!userId) return
      void writeToAccount(queryClient, saveToAccount, userId, categoryIds).then((outcome) => {
        if (outcome.status === 'failed') toast.error(getErrorMessage(outcome.error))
      })
    },
    [userId, queryClient, saveToAccount],
  )

  const interests = userId ? (account.data ?? UNANSWERED) : UNANSWERED
  return {
    interests,
    answered: Boolean(interests.answeredAt),
    isPending: isSessionPending || (userId !== null && account.isPending),
    isError: userId !== null && account.isError,
    setCategoryIds,
  }
}
