import { beforeEach, describe, expect, it } from 'vitest'

import { ASSISTANT_STORAGE_KEY, useAssistantStore } from '@/features/assistant/store'
import type { AssistantMessage } from '@/types/assistant'

interface StoredShape {
  state: { messages: AssistantMessage[] }
}

const userMessage: AssistantMessage = { id: 'm1', role: 'user', text: 'hello' }
const assistantMessage: AssistantMessage = {
  id: 'm2',
  role: 'assistant',
  reply: { text: 'Hi there', shops: [], suggestions: ['Salons open now'] },
}

beforeEach(() => {
  sessionStorage.clear()
  useAssistantStore.setState({ open: false, messages: [], busy: false })
})

describe('assistant store', () => {
  it('persists only the messages to sessionStorage', () => {
    useAssistantStore.getState().setOpen(true)
    useAssistantStore.getState().setBusy(true)
    useAssistantStore.getState().append(userMessage)
    useAssistantStore.getState().append(assistantMessage)

    const stored = JSON.parse(sessionStorage.getItem(ASSISTANT_STORAGE_KEY) ?? '{}') as StoredShape
    expect(stored.state).toEqual({ messages: [userMessage, assistantMessage] })
  })

  it('restores stored messages, but not open or busy', async () => {
    sessionStorage.setItem(
      ASSISTANT_STORAGE_KEY,
      JSON.stringify({ state: { messages: [userMessage, assistantMessage], open: true, busy: true }, version: 0 }),
    )
    await useAssistantStore.persist.rehydrate()

    const state = useAssistantStore.getState()
    expect(state.messages).toEqual([userMessage, assistantMessage])
    expect(state.open).toBe(false)
    expect(state.busy).toBe(false)
  })

  it.each([
    ['corrupt JSON', '{not json'],
    ['messages of the wrong type', JSON.stringify({ state: { messages: 'nope' }, version: 0 })],
    ['a malformed message', JSON.stringify({ state: { messages: [{ id: 'x', role: 'user' }] }, version: 0 })],
  ])('falls back to no messages on %s', async (_label, raw) => {
    sessionStorage.setItem(ASSISTANT_STORAGE_KEY, raw)
    await useAssistantStore.persist.rehydrate()

    expect(useAssistantStore.getState().messages).toEqual([])
  })

  it('clear empties the conversation and the stored copy', () => {
    useAssistantStore.getState().append(userMessage)
    useAssistantStore.getState().clear()

    expect(useAssistantStore.getState().messages).toEqual([])
    const stored = JSON.parse(sessionStorage.getItem(ASSISTANT_STORAGE_KEY) ?? '{}') as StoredShape
    expect(stored.state.messages).toEqual([])
  })
})
