import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import { accountKeys, useMyInterestsQuery, useUpdateInterestsMutation } from '@/features/account/api/queries'
import { useSession } from '@/features/auth/api/queries'
import { useLocalInterests } from '@/features/interests/interests-store'
import type { CustomerInterests } from '@/types/account'
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
  dismiss: () => void
}

const UNANSWERED: CustomerInterests = { categoryIds: [] }

interface AccountWrites {
  /** Bumped by every pick; only the request for the latest one may change the cache. */
  seq: number
  /** The requests, one after another. */
  chain: Promise<void>
  /** The latest pick, as written to the cache. */
  latest?: CustomerInterests
}

/**
 * What the viewer is here for. Guests keep it in this browser; signed-in customers keep it
 * on their account, and a guest answer is copied there once when they sign in.
 */
export function useInterests(): InterestsState {
  const queryClient = useQueryClient()
  const { user, isPending: isSessionPending } = useSession()
  const signedIn = user !== null
  const account = useMyInterestsQuery(signedIn)
  const { mutateAsync: saveToAccount } = useUpdateInterestsMutation()
  const local = useLocalInterests((state) => state.interests)

  const writes = useRef<AccountWrites>({ seq: 0, chain: Promise.resolve() })
  const handedOffFor = useRef<ID | null>(null)

  /** Shows the pick at once, then saves it. Resolves true when this pick was saved and is still the latest. */
  const writeToAccount = useCallback(
    (categoryIds: ID[]) => {
      const state = writes.current
      const seq = ++state.seq
      const key = accountKeys.interests()
      const answeredAt = queryClient.getQueryData<CustomerInterests>(key)?.answeredAt ?? new Date().toISOString()
      state.latest = { categoryIds, answeredAt }
      queryClient.setQueryData<CustomerInterests>(key, state.latest)

      const step = state.chain.then(async () => {
        if (seq !== state.seq) return false // A later pick replaced this one before it was sent.
        try {
          await saveToAccount(categoryIds)
          if (seq === state.seq) return true
          // Superseded while in flight: the mutation wrote this older answer, so show the latest pick again.
          queryClient.setQueryData<CustomerInterests>(key, state.latest)
          return false
        } catch {
          // Only the latest pick's failure counts: show what the server has.
          if (seq === state.seq) void queryClient.invalidateQueries({ queryKey: key })
          return false
        }
      })
      state.chain = step.then(() => undefined)
      return step
    },
    [queryClient, saveToAccount],
  )

  // Once per signed-in user, after their account answer has loaded: keep a guest answer.
  useEffect(() => {
    if (!user || account.isPending || account.isError) return
    if (handedOffFor.current === user.id) return
    handedOffFor.current = user.id
    const { interests: browser, clear } = useLocalInterests.getState()
    if (!browser.answeredAt) return
    if (account.data.answeredAt) {
      clear() // The account's own answer wins.
      return
    }
    // A failed write leaves the browser copy for the next visit.
    void writeToAccount(browser.categoryIds).then((saved) => {
      if (saved) clear()
    })
  }, [user, account.isPending, account.isError, account.data, writeToAccount])

  const setCategoryIds = useCallback(
    (categoryIds: ID[]) => {
      if (signedIn) void writeToAccount(categoryIds)
      else useLocalInterests.getState().set(categoryIds)
    },
    [signedIn, writeToAccount],
  )

  const interests = signedIn ? (account.data ?? UNANSWERED) : local
  return {
    interests,
    answered: Boolean(interests.answeredAt),
    isPending: isSessionPending || (signedIn && account.isPending),
    isError: signedIn && account.isError,
    setCategoryIds,
    dismiss: () => setCategoryIds([]),
  }
}
