import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '@/lib/api-client'

function stubFetch() {
  const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
    Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiClient request bodies', () => {
  it('sends FormData as is, leaving the Content-Type to the browser', async () => {
    const fetchMock = stubFetch()
    const form = new FormData()
    form.append('file', new File(['x'], 'a.png', { type: 'image/png' }))
    await apiClient.post('/x', form)
    const init = fetchMock.mock.calls[0]![1]!
    expect(init.body).toBe(form)
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('still sends other bodies as JSON', async () => {
    const fetchMock = stubFetch()
    await apiClient.post('/x', { a: 1 })
    const init = fetchMock.mock.calls[0]![1]!
    expect(init.body).toBe('{"a":1}')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })
})
