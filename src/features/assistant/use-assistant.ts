import { useCallback, useEffect, useRef } from 'react'

import { useSession } from '@/features/auth/api/queries'
import { createDefaultDeps, createRuleEngine, type AssistantEngine } from '@/features/assistant/engine'
import { useAssistantStore } from '@/features/assistant/store'
import { useInterests } from '@/features/interests/use-interests'
import { useUserLocation } from '@/hooks/use-user-location'
import { createRandomId } from '@/lib/ids'
import type { AssistantReply } from '@/types/assistant'
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

const FAILURE_REPLY: AssistantReply = {
  text: 'Sorry, something went wrong on my end. Please try again in a moment.',
  shops: [],
  suggestions: [],
}

/** `engine` is injectable for tests; defaults to the app-wide rule engine. */
export function useAssistant(engine?: AssistantEngine) {
  const { open, messages, busy, setOpen, append, setBusy, clear } = useAssistantStore()
  const { user, isPending } = useSession()
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
  // undefined until the session first resolves: a reload must not read "loading" as a user change.
  const previousUserId = useRef<ID | null | undefined>(undefined)
  useEffect(() => {
    if (isPending) return
    const previous = previousUserId.current
    previousUserId.current = userId
    if (previous === undefined || previous === userId) return
    epoch.current += 1
    clear()
  }, [userId, isPending, clear])

  useEffect(() => {
    if (!open || messages.length > 0 || greeting.current) return
    greeting.current = true
    const started = epoch.current
    void (async () => {
      let reply: AssistantReply
      try {
        reply = await activeEngine.greeting()
      } catch {
        reply = FAILURE_REPLY
      }
      greeting.current = false
      if (started !== epoch.current || useAssistantStore.getState().messages.length > 0) return
      append({ id: createRandomId(), role: 'assistant', reply })
    })()
  }, [open, messages.length, activeEngine, append])

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const started = epoch.current
      append({ id: createRandomId(), role: 'user', text: trimmed })
      setBusy(true)
      void (async () => {
        let reply: AssistantReply
        try {
          reply = await activeEngine.reply(trimmed)
        } catch {
          reply = FAILURE_REPLY
        }
        if (started !== epoch.current) return
        append({ id: createRandomId(), role: 'assistant', reply })
        setBusy(false)
      })()
    },
    [activeEngine, append, setBusy],
  )

  return { open, setOpen, messages, busy, send }
}
