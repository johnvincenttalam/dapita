import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { sessionKeys } from '@/features/auth/api/queries'
import { bookingKeys } from '@/features/booking/api/queries'
import type { RealtimeEvent } from '@/features/realtime/realtime-events'
import { useRealtimeSync } from '@/features/realtime/use-realtime-sync'
import { conversationKeys } from '@/features/messaging/api/queries'
import { createTestQueryClient } from '@/test/render'
import type { SessionUser } from '@/types/auth'

// A stand-in for the Transmit client: records subscriptions and lets the test push events.
const fake = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown) => void>()
  const listeners = new Map<string, () => void>()
  const client = {
    subscription: vi.fn((channel: string) => ({
      create: vi.fn(() => Promise.resolve()),
      onMessage: (handler: (event: unknown) => void) => {
        handlers.set(channel, handler)
        return () => handlers.delete(channel)
      },
    })),
    on: vi.fn((name: string, callback: () => void) => listeners.set(name, callback)),
    off: vi.fn((name: string) => listeners.delete(name)),
    close: vi.fn(),
  }
  return { client, handlers, listeners }
})

const createRealtimeClient = vi.hoisted(() => vi.fn<() => unknown>())
vi.mock('@/features/realtime/realtime-client', () => ({ createRealtimeClient }))

const owner: SessionUser = {
  id: 'usr_merchant',
  name: 'Paolo Mendoza',
  email: 'owner@example.com',
  roles: ['customer', 'merchant_owner'],
  memberships: [{ businessId: 'biz_good_cut', businessName: 'The Good Cut Barbershop', role: 'owner' }],
  emailVerified: true,
}

function setup(user: SessionUser | null, enabled = true) {
  const queryClient = createTestQueryClient()
  queryClient.setQueryData(sessionKeys.current, user)
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const hook = renderHook(() => useRealtimeSync({ enabled }), { wrapper })
  return { ...hook, invalidate }
}

const push = (channel: string, event: RealtimeEvent) => fake.handlers.get(channel)?.(event)

describe('useRealtimeSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createRealtimeClient.mockImplementation(() => fake.client)
    fake.handlers.clear()
    fake.listeners.clear()
  })

  it('listens on the user’s channel and each business they manage', () => {
    setup(owner)
    expect(fake.client.subscription.mock.calls.map(([channel]) => channel)).toEqual([
      'users/usr_merchant',
      'businesses/biz_good_cut',
    ])
  })

  it('refetches bookings when a booking changes on another device', () => {
    const { invalidate } = setup(owner)
    push('businesses/biz_good_cut', { type: 'booking.changed', bookingId: 'bk_1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all })
  })

  it('refetches conversations when a message arrives', () => {
    const { invalidate } = setup(owner)
    push('users/usr_merchant', { type: 'conversation.changed', conversationId: 'conv_1' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: conversationKeys.all })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: bookingKeys.all })
  })

  it('catches up after the connection drops and comes back', () => {
    const { invalidate } = setup(owner)
    const connected = fake.listeners.get('connected')
    connected?.()
    expect(invalidate).not.toHaveBeenCalled()
    connected?.()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: bookingKeys.all })
  })

  it('closes the connection on unmount', () => {
    const { unmount } = setup(owner)
    unmount()
    expect(fake.client.close).toHaveBeenCalled()
  })

  it('does nothing when signed out or in mock mode', () => {
    setup(null)
    setup(owner, false)
    expect(fake.client.subscription).not.toHaveBeenCalled()
  })

  it('never breaks the page if the realtime client can’t start', () => {
    createRealtimeClient.mockImplementation(() => {
      throw new TypeError('crypto.randomUUID is not a function')
    })
    expect(() => setup(owner)).not.toThrow()
  })
})
