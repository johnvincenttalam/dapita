import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { adminService } from '@/services/admin.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'
import { supportService } from '@/services/support.service'

vi.mock('@/services/mock/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof MockUtils>()),
  delay: () => Promise.resolve(),
}))

// Wednesday 21 Oct 2026, 11:00 in Manila. The mock database seeds relative to this.
const NOW = new Date('2026-10-21T03:00:00Z')

function signInAs(account: MockAccount | null) {
  if (account) localStorage.setItem(MOCK_SESSION_KEY, mockUsers[account].id)
  else localStorage.removeItem(MOCK_SESSION_KEY)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  signInAs('customer')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('supportService (mock)', () => {
  it('opens a case about a booking that staff can work', async () => {
    const receipt = await supportService.sendRequest({
      topic: 'booking',
      bookingId: 'bk_andrea_completed',
      message: 'The shop charged ₱200 more than the listed price.',
    })

    signInAs('admin')
    const details = await adminService.getCase(receipt.id)
    expect(details).toMatchObject({
      kind: 'booking',
      status: 'open',
      reason: 'The shop charged ₱200 more than the listed price.',
      reporterName: 'Andrea Reyes',
      reporterSide: 'customer',
      reporterEmail: 'customer@example.com',
      bookingId: 'bk_andrea_completed',
      businessName: 'Polished Nail Studio',
      messages: [],
    })
    expect(details.booking).toMatchObject({ reference: 'DP-2HF6NC', status: 'completed' })
    expect(details.events.map((event) => event.kind)).toEqual(['opened'])
  })

  it('reports a live listing, and only a live one', async () => {
    const receipt = await supportService.sendRequest({
      topic: 'listing',
      businessId: 'biz_good_cut',
      message: 'The haircut price on the listing is out of date.',
    })
    signInAs('admin')
    expect(await adminService.getCase(receipt.id)).toMatchObject({ kind: 'listing', businessId: 'biz_good_cut' })

    signInAs('customer')
    await expect(
      supportService.sendRequest({ topic: 'listing', businessId: 'biz_kulot', message: 'This shop isn’t live yet.' }),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      supportService.sendRequest({ topic: 'listing', message: 'Which shop? I didn’t say.' }),
    ).rejects.toMatchObject({ status: 422 })
  })

  it('keeps other people’s bookings out of reach', async () => {
    await expect(
      supportService.sendRequest({ topic: 'booking', bookingId: 'bk_gc_john', message: 'Not my booking at all.' }),
    ).rejects.toMatchObject({ status: 404 })

    // The shop's owner can ask about it, from the shop's side.
    signInAs('merchant')
    const receipt = await supportService.sendRequest({
      topic: 'booking',
      bookingId: 'bk_gc_john',
      message: 'This customer keeps booking and not arriving.',
    })
    signInAs('admin')
    expect(await adminService.getCase(receipt.id)).toMatchObject({ reporterSide: 'business' })
  })

  it('needs a signed-in sender, a real message and a short queue', async () => {
    signInAs(null)
    await expect(
      supportService.sendRequest({ topic: 'account', message: 'Please send my data.' }),
    ).rejects.toMatchObject({ status: 401 })

    signInAs('customer')
    await expect(supportService.sendRequest({ topic: 'other', message: 'Help' })).rejects.toMatchObject({
      status: 422,
    })
    for (let index = 0; index < 5; index++) {
      await supportService.sendRequest({ topic: 'other', message: `Question number ${index + 1} for you.` })
    }
    await expect(
      supportService.sendRequest({ topic: 'other', message: 'One more question for you.' }),
    ).rejects.toMatchObject({ status: 429 })
  })
})
