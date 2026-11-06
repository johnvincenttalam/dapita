import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { AssistantMessage } from '@/types/assistant'

export const ASSISTANT_STORAGE_KEY = 'dapita-assistant'

interface AssistantState {
  open: boolean
  messages: AssistantMessage[]
  busy: boolean
  setOpen: (open: boolean) => void
  append: (message: AssistantMessage) => void
  setBusy: (busy: boolean) => void
  clear: () => void
}

type StoredAssistant = Pick<AssistantState, 'messages'>

const isMessage = (value: unknown): value is AssistantMessage => {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  if (typeof message.id !== 'string') return false
  if (message.role === 'user') return typeof message.text === 'string'
  if (message.role === 'assistant') {
    const reply = message.reply as Record<string, unknown> | null | undefined
    return (
      typeof reply === 'object' &&
      reply !== null &&
      typeof reply.text === 'string' &&
      Array.isArray(reply.shops) &&
      Array.isArray(reply.suggestions)
    )
  }
  return false
}

/**
 * The assistant panel and its conversation. Only the messages are remembered, and only for
 * this browser tab (sessionStorage); the panel opens closed and idle on a fresh mount.
 */
export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      open: false,
      messages: [],
      busy: false,
      setOpen: (open) => set({ open }),
      append: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setBusy: (busy) => set({ busy }),
      clear: () => set({ messages: [], busy: false }),
    }),
    {
      name: ASSISTANT_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ messages }): StoredAssistant => ({ messages }),
      // Anything unreadable in storage counts as an empty conversation.
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<StoredAssistant>
        const messages = Array.isArray(stored.messages) && stored.messages.every(isMessage) ? stored.messages : []
        return { ...current, messages }
      },
    },
  ),
)
