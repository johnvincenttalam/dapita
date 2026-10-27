import { afterEach, describe, expect, it, vi } from 'vitest'

import { createIdempotencyKey, createRandomId } from '@/lib/ids'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('createRandomId', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses crypto.randomUUID when the page is a secure context', () => {
    expect(createRandomId()).toMatch(UUID)
  })

  it('still works on an insecure origin, where crypto.randomUUID is missing (a phone on a LAN IP)', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    const ids = new Set(Array.from({ length: 50 }, () => createRandomId()))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(UUID)
  })

  it('gives idempotency keys the same way', () => {
    vi.stubGlobal('crypto', { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })
    expect(createIdempotencyKey()).toMatch(UUID)
  })
})
