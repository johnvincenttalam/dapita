import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'

import { accountKeys, useMyInterestsQuery, useUpdateInterestsMutation } from '@/features/account/api/queries'
import { sessionKeys, useSession } from '@/features/auth/api/queries'
import { useCategoriesQuery } from '@/features/discovery/api/queries'
import { useLocalInterests } from '@/features/interests/interests-store'
import { ApiError, getErrorMessage } from '@/lib/api-client'
import { dropRetiredInterests } from '@/lib/interests'
import type { CustomerInterests } from '@/types/account'
import type { Session } from '@/types/auth'
import type { ID } from '@/types/common'

export interface InterestsState {
  interests: CustomerInterests
  /** True once picked or dismissed, wherever it is stored. */
  answered: boolean
  /** True while the session or the account's answer is still loading. */
  isPending: boolean
  /** True when a signed-in customer's answer could not be loaded; the UI shows nothing. */
  isError: boolean
  setCategoryIds: (categoryIds: ID[]) => void
  /** Saves an empty answer; resolves to how the save ended ('failed' has already been toasted). */
  dismiss: () => Promise<SaveOutcome>
}

/** 'superseded': a later pick or a sign-out replaced this one before it was confirmed. */
export type SaveOutcome = 'saved' | 'superseded' | 'failed'

const UNANSWERED: CustomerInterests = { categoryIds: [] }

/**
 * Account writes for one signed-in user, shared by every mounted useInterests so the page
 * sends one request at a time and copies a guest answer once. Replaced when the user changes.
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
  /** Set once the guest answer has been looked at for this sign-in. */
  handedOff: boolean
}

let sync: AccountSync = { userId: null, seq: 0, chain: Promise.resolve(), handedOff: false }

/** The writes for `userId`. A different user drops the old user's queued and in-flight picks. */
function syncFor(userId: ID | null): AccountSync {
  if (sync.userId !== userId) sync = { userId, seq: sync.seq + 1, chain: sync.chain, handedOff: false }
  return sync
}

/** Forgets every queued write and the handoff guard. For tests. */
export function resetInterestsSync() {
  sync = { userId: null, seq: 0, chain: Promise.resolve(), handedOff: false }
}

type WriteOutcome = { status: 'saved' } | { status: 'superseded' } | { status: 'failed'; error: unknown }

/** Shows the pick at once, then saves it after any request already in flight. */
function writeToAccount(
  queryClient: QueryClient,
  save: (categoryIds: ID[]) => Promise<CustomerInterests>,
  userId: ID,
  categoryIds: ID[],
): Promise<WriteOutcome> {
  const state = syncFor(userId)
  const seq = ++state.seq
  const key = accountKeys.interests()
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
      const saved = await save(categoryIds)
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

/**
 * What the viewer is here for. Guests keep it in this browser; signed-in customers keep it
 * on their account, and a guest answer is copied there once when they sign in.
 */
export function useInterests(): InterestsState {
  const queryClient = useQueryClient()
  const { user, isPending: isSessionPending } = useSession()
  const userId = user?.id ?? null
  const account = useMyInterestsQuery(userId !== null)
  const { mutateAsync: saveToAccount } = useUpdateInterestsMutation()
  const local = useLocalInterests((state) => state.interests)
  const categories = useCategoriesQuery()

  // Signing out or switching user drops the previous user's queued picks. Signing out also
  // forgets a guest answer that never reached the account, so the next guest starts fresh.
  useEffect(() => {
    const signedOut = sync.userId !== null && userId === null
    syncFor(userId)
    if (signedOut) useLocalInterests.getState().clear()
  }, [userId])

  // Once per sign-in, after the account answer and the catalog have loaded: keep a guest answer.
  // Never shown to the user.
  useEffect(() => {
    if (!userId || account.isPending || account.isError || categories.isPending) return
    const state = syncFor(userId)
    if (state.handedOff) return
    state.handedOff = true
    const { interests: stored, clear } = useLocalInterests.getState()
    if (!stored.answeredAt) return
    if (account.data.answeredAt) {
      clear() // The account's own answer wins.
      return
    }
    // A pick retired since it was made would get the whole answer refused, so it is left out.
    // Without the catalog the ids go as they are, and the server decides.
    const browser = categories.isSuccess ? dropRetiredInterests(stored, categories.data) : stored
    void writeToAccount(queryClient, saveToAccount, userId, browser.categoryIds).then((outcome) => {
      if (outcome.status === 'saved') clear()
      if (outcome.status !== 'failed') return
      console.warn('Could not copy the guest interests to the account.', outcome.error)
      // Ids that are no longer on the list will never save; anything else is tried again next visit.
      if (outcome.error instanceof ApiError && outcome.error.status === 422) clear()
    })
  }, [
    userId,
    account.isPending,
    account.isError,
    account.data,
    categories.isPending,
    categories.isSuccess,
    categories.data,
    queryClient,
    saveToAccount,
  ])

  const save = useCallback(
    async (categoryIds: ID[]): Promise<SaveOutcome> => {
      if (!userId) {
        useLocalInterests.getState().set(categoryIds)
        return 'saved'
      }
      const outcome = await writeToAccount(queryClient, saveToAccount, userId, categoryIds)
      if (outcome.status === 'failed') toast.error(getErrorMessage(outcome.error))
      return outcome.status
    },
    [userId, queryClient, saveToAccount],
  )
  const setCategoryIds = useCallback((categoryIds: ID[]) => void save(categoryIds), [save])
  const dismiss = useCallback(() => save([]), [save])

  // Until a guest answer has reached the account (or if copying it failed), it is the answer,
  // without the picks the copy leaves out.
  const keepsGuestAnswer = account.isSuccess && !account.data.answeredAt && Boolean(local.answeredAt)
  const guestAnswer = useMemo(
    () => (categories.isSuccess ? dropRetiredInterests(local, categories.data) : local),
    [local, categories.isSuccess, categories.data],
  )
  const interests = !userId ? local : keepsGuestAnswer ? guestAnswer : (account.data ?? UNANSWERED)
  return {
    interests,
    answered: Boolean(interests.answeredAt),
    isPending: isSessionPending || (userId !== null && account.isPending),
    isError: userId !== null && account.isError,
    setCategoryIds,
    dismiss,
  }
}
