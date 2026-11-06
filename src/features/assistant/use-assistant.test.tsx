import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSession } from '@/features/auth/api/queries'
import type { AssistantEngine } from '@/features/assistant/engine'
import { useAssistantStore } from '@/features/assistant/store'
import { useAssistant } from '@/features/assistant/use-assistant'
import type { AssistantReply } from '@/types/assistant'

vi.mock('@/features/auth/api/queries', () => ({ useSession: vi.fn() }))
vi.mock('@/features/interests/use-interests', () => ({
  useInterests: () => ({ interests: { categoryIds: [] } }),
}))

const greeting: AssistantReply = { text: 'Hello!', shops: [], suggestions: ['Salons open now'] }
const answer: AssistantReply = { text: 'Here you go', shops: [], suggestions: [] }

function mockUser(id: string | null) {
  vi.mocked(useSession).mockReturnValue({ user: id ? { id } : null } as unknown as ReturnType<typeof useSession>)
}

function fakeEngine(reply: () => Promise<AssistantReply> = () => Promise.resolve(answer)) {
  return { reply: vi.fn(reply), greeting: vi.fn(() => greeting) } satisfies AssistantEngine
}

beforeEach(() => {
  sessionStorage.clear()
  useAssistantStore.setState({ open: false, messages: [], busy: false })
  mockUser(null)
})

describe('useAssistant', () => {
  it('ignores whitespace-only text', () => {
    const engine = fakeEngine()
    const { result } = renderHook(() => useAssistant(engine))

    act(() => result.current.send('   \n '))

    expect(result.current.messages).toEqual([])
    expect(engine.reply).not.toHaveBeenCalled()
    expect(result.current.busy).toBe(false)
  })

  it('appends the user message, then the reply, toggling busy', async () => {
    let resolve!: (reply: AssistantReply) => void
    const engine = fakeEngine(() => new Promise((r) => (resolve = r)))
    const { result } = renderHook(() => useAssistant(engine))

    act(() => result.current.send('  find a salon  '))

    expect(engine.reply).toHaveBeenCalledWith('find a salon')
    expect(result.current.busy).toBe(true)
    expect(result.current.messages).toMatchObject([{ role: 'user', text: 'find a salon' }])

    await act(() => {
      resolve(answer)
      return Promise.resolve()
    })

    expect(result.current.busy).toBe(false)
    expect(result.current.messages).toMatchObject([
      { role: 'user', text: 'find a salon' },
      { role: 'assistant', reply: answer },
    ])
  })

  it('greets once when opened with no messages', async () => {
    const engine = fakeEngine()
    const { result } = renderHook(() => useAssistant(engine))

    act(() => result.current.setOpen(true))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    expect(result.current.messages[0]).toMatchObject({ role: 'assistant', reply: greeting })

    act(() => result.current.setOpen(false))
    act(() => result.current.setOpen(true))
    expect(result.current.messages).toHaveLength(1)
    expect(engine.greeting).toHaveBeenCalledTimes(1)
  })

  it('does not greet over an existing conversation', () => {
    useAssistantStore.setState({ messages: [{ id: 'a', role: 'user', text: 'hi' }] })
    const engine = fakeEngine()
    const { result } = renderHook(() => useAssistant(engine))

    act(() => result.current.setOpen(true))

    expect(engine.greeting).not.toHaveBeenCalled()
    expect(result.current.messages).toHaveLength(1)
  })

  it('keeps the conversation on the initial mount', () => {
    mockUser('u1')
    useAssistantStore.setState({ messages: [{ id: 'a', role: 'user', text: 'hi' }] })
    renderHook(() => useAssistant(fakeEngine()))

    expect(useAssistantStore.getState().messages).toHaveLength(1)
  })

  it('clears the conversation when the signed-in user changes', () => {
    mockUser('u1')
    useAssistantStore.setState({ messages: [{ id: 'a', role: 'user', text: 'hi' }] })
    const engine = fakeEngine()
    const { rerender } = renderHook(() => useAssistant(engine))

    mockUser('u1')
    rerender()
    expect(useAssistantStore.getState().messages).toHaveLength(1)

    mockUser(null)
    rerender()
    expect(useAssistantStore.getState().messages).toEqual([])
  })

  it('drops a reply that arrives after the conversation was cleared', async () => {
    mockUser('u1')
    let resolve!: (reply: AssistantReply) => void
    const engine = fakeEngine(() => new Promise((r) => (resolve = r)))
    const { result, rerender } = renderHook(() => useAssistant(engine))

    act(() => result.current.send('find a salon'))
    mockUser('u2')
    rerender()
    await act(() => {
      resolve(answer)
      return Promise.resolve()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.busy).toBe(false)
  })

  it('recovers with an honest reply when the engine rejects', async () => {
    const engine = fakeEngine(() => Promise.reject(new Error('boom')))
    const { result } = renderHook(() => useAssistant(engine))

    await act(() => {
      result.current.send('find a salon')
      return Promise.resolve()
    })

    expect(result.current.busy).toBe(false)
    expect(result.current.messages).toHaveLength(2)
    const last = result.current.messages.at(-1)
    expect(last?.role).toBe('assistant')
    expect(last && 'reply' in last ? last.reply.text : '').toContain('something went wrong')
  })

  it('stays quiet when a rejection lands after the conversation was cleared', async () => {
    mockUser('u1')
    let reject!: (error: Error) => void
    const engine = fakeEngine(() => new Promise((_, r) => (reject = r)))
    const { result, rerender } = renderHook(() => useAssistant(engine))

    act(() => result.current.send('find a salon'))
    mockUser('u2')
    rerender()
    await act(() => {
      reject(new Error('boom'))
      return Promise.resolve()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.busy).toBe(false)
  })
})
