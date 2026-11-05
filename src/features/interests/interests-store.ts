import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { CustomerInterests } from '@/types/account'
import type { ID } from '@/types/common'

export const INTERESTS_STORAGE_KEY = 'dapita-interests'

interface LocalInterestsState {
  interests: CustomerInterests
  /** Saves the guest's answer, including an empty one (dismissed). */
  set: (categoryIds: ID[]) => void
  /** Forgets the answer, here and in storage. */
  clear: () => void
}

const UNANSWERED: CustomerInterests = { categoryIds: [] }

const isStoredInterests = (value: unknown): value is { interests: CustomerInterests } => {
  const interests = (value as { interests?: unknown } | null)?.interests as CustomerInterests | undefined
  return (
    typeof interests === 'object' &&
    interests !== null &&
    Array.isArray(interests.categoryIds) &&
    interests.categoryIds.every((id) => typeof id === 'string')
  )
}

/**
 * What a guest is here for, remembered on this device until they sign in; the account
 * then keeps it (see useInterests). Never sent to the server on its own.
 */
export const useLocalInterests = create<LocalInterestsState>()(
  persist(
    (set) => ({
      interests: UNANSWERED,
      set: (categoryIds) => set({ interests: { categoryIds: [...categoryIds], answeredAt: new Date().toISOString() } }),
      clear: () => set({ interests: UNANSWERED }),
    }),
    {
      name: INTERESTS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ interests }) => ({ interests }),
      // Anything unreadable in storage counts as unanswered, so the page asks again.
      merge: (persisted, current) => {
        if (!isStoredInterests(persisted)) return { ...current, interests: UNANSWERED }
        const { categoryIds, answeredAt } = persisted.interests
        return {
          ...current,
          interests: { categoryIds, answeredAt: typeof answeredAt === 'string' ? answeredAt : undefined },
        }
      },
    },
  ),
)
