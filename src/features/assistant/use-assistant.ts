import { useCallback, useEffect, useRef } from 'react'

import { useSession } from '@/features/auth/api/queries'
import { createDefaultDeps, createRuleEngine, type AssistantEngine } from '@/features/assistant/engine'
import { useAssistantStore } from '@/features/assistant/store'
import { useInterests } from '@/features/interests/use-interests'
import { useUserLocation } from '@/hooks/use-user-location'
import { createRandomId } from '@/lib/ids'
import type { ID } from '@/types/common'

/** The default deps cache the catalog per instance, so the app shares one engine. */
let sharedEngine: AssistantEngine | undefined
let latestInterestIds: readonly ID[] = []

function getSharedEngine() {
  sharedEngine ??= createRuleEngine(
    createDefaultDeps({
      getPosition: () => useUserLocation.getState().position,
      getInterestCategoryIds: () => latestInterestIds,
    }),
  )
  return sharedEngine
}

/** `engine` is injectable for tests; defaults to the app-wide rule engine. */
export function useAssistant(engine?: AssistantEngine) {
  const { open, messages, busy, setOpen, append, setBusy, clear } = useAssistantStore()
  const { user } = useSession()
  const { interests } = useInterests()
  const activeEngine = engine ?? getSharedEngine()

  const interestIds = interests.categoryIds
  useEffect(() => {
    latestInterestIds = interestIds
  }, [interestIds])

  // Bumped whenever the conversation is cleared, so a reply still in flight is dropped.
  const epoch = useRef(0)
  const greeting = useRef(false)

  const userId = user?.id ?? null
  const previousUserId = useRef(userId)
  useEffect(() => {
    if (previousUserId.current === userId) return
    previousUserId.current = userId
    epoch.current += 1
    clear()
  }, [userId, clear])

  useEffect(() => {
    if (!open || messages.length > 0 || greeting.current) return
    greeting.current = true
    const started = epoch.current
    void Promise.resolve(activeEngine.greeting()).then((reply) => {
      greeting.current = false
      if (started !== epoch.current || useAssistantStore.getState().messages.length > 0) return
      append({ id: createRandomId(), role: 'assistant', reply })
    })
  }, [open, messages.length, activeEngine, append])

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const started = epoch.current
      append({ id: createRandomId(), role: 'user', text: trimmed })
      setBusy(true)
      void activeEngine.reply(trimmed).then((reply) => {
        if (started !== epoch.current) return
        append({ id: createRandomId(), role: 'assistant', reply })
        setBusy(false)
      })
    },
    [activeEngine, append, setBusy],
  )

  return { open, setOpen, messages, busy, send }
}
