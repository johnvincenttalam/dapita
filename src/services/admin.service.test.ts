import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as MockUtils from '@/services/mock/utils'
import { availableModerationActions } from '@/lib/moderation'
import { adminService } from '@/services/admin.service'
import { authService } from '@/services/auth.service'
import { catalogService } from '@/services/catalog.service'
import { conversationsService } from '@/services/conversations.service'
import { merchantBusinessService } from '@/services/merchant-business.service'
import { MOCK_SESSION_KEY, mockUsers, type MockAccount } from '@/services/mock/users'
import { shopsService } from '@/services/shops.service'

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
  signInAs('admin')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('availableModerationActions', () => {
  it('follows the listing’s state', () => {
    expect(availableModerationActions('pending_review')).toEqual(['approve', 'request_changes', 'reject'])
    expect(availableModerationActions('approved')).toEqual(['suspend'])
    expect(availableModerationActions('suspended')).toEqual(['reinstate'])
    expect(availableModerationActions('changes_requested')).toEqual(['reject'])
    expect(availableModerationActions('draft')).toEqual([])
    expect(availableModerationActions('rejected')).toEqual([])
  })
})

describe('listing moderation (mock service)', () => {
  it('is for administrators only', async () => {
    signInAs('merchant')
    await expect(adminService.listMerchants()).rejects.toMatchObject({ status: 403 })
    signInAs(null)
    await expect(adminService.listMerchants()).rejects.toMatchObject({ status: 401 })
  })

  it('lists listings with the ones waiting for review', async () => {
    const list = await adminService.listMerchants()
    expect(list.find((item) => item.id === 'biz_kulot')).toMatchObject({
      name: 'Kulot Studio',
      status: 'pending_review',
      areaName: 'Bajada',
      categoryNames: ['Salon'],
    })
    expect(list.find((item) => item.id === 'biz_good_cut')).toMatchObject({
      status: 'approved',
      ownerName: 'Paolo Mendoza',
    })
  })

  it('shows a listing’s details, services and the actions it allows', async () => {
    const review = await adminService.getMerchantReview('biz_kulot')
    expect(review.business.name).toBe('Kulot Studio')
    expect(review.services.map((service) => service.name)).toContain('Curly Cut')
    expect(review.availableActions).toEqual(['approve', 'request_changes', 'reject'])
    expect(review.history).toEqual([])
  })

  it('approves a listing, making it public and recording who and why', async () => {
    const review = await adminService.moderateMerchant('biz_kulot', {
      action: 'approve',
      reason: 'Address and services check out.',
    })
    expect(review.business.status).toBe('approved')
    expect(review.history).toEqual([
      expect.objectContaining({
        action: 'approve',
        from: 'pending_review',
        to: 'approved',
        reason: 'Address and services check out.',
        actorName: 'Mika Santos',
      }),
    ])
    await expect(shopsService.getShop('kulot-studio')).resolves.toMatchObject({ name: 'Kulot Studio' })
  })

  it('sends a listing back with a note the owner can see', async () => {
    await adminService.moderateMerchant('biz_kulot', {
      action: 'request_changes',
      reason: 'Please add the street number to your address.',
    })
    const { business } = await adminService.getMerchantReview('biz_kulot')
    expect(business).toMatchObject({
      status: 'changes_requested',
      moderationNote: 'Please add the street number to your address.',
    })
  })

  it('suspends a live listing and takes it out of public view', async () => {
    await adminService.moderateMerchant('biz_polished', {
      action: 'suspend',
      reason: 'Asked customers for off-app deposits.',
    })
    await expect(shopsService.getShop('polished-nail-studio')).rejects.toMatchObject({ status: 404 })
    signInAs('merchant')
    // Not the owner's own listing, so nothing changes for them.
    await expect(merchantBusinessService.getBusiness('biz_good_cut')).resolves.toMatchObject({
      business: { status: 'approved' },
    })
  })

  it('refuses actions the listing’s state doesn’t allow, and empty reasons', async () => {
    await expect(
      adminService.moderateMerchant('biz_good_cut', { action: 'approve', reason: 'Looks fine to me.' }),
    ).rejects.toMatchObject({ status: 409, message: 'This listing can’t be approved while it’s live.' })
    await expect(adminService.moderateMerchant('biz_kulot', { action: 'reject', reason: '' })).rejects.toMatchObject({
      status: 422,
    })
  })
})

describe('support cases (mock service)', () => {
  it('turns a reported conversation into an open case with the transcript', async () => {
    const cases = await adminService.listCases()
    const seeded = cases.find((item) => item.conversationId === 'conv_bea_polished')
    expect(seeded).toMatchObject({
      status: 'open',
      customerName: 'Bea Villanueva',
      businessName: 'Polished Nail Studio',
    })

    const details = await adminService.getCase(seeded?.id ?? '')
    expect(details.messages.map((message) => message.senderRole)).toEqual(['customer', 'business', 'customer'])
    expect(details.events[0]).toMatchObject({ kind: 'opened' })
  })

  it('opens a case when someone reports a conversation', async () => {
    signInAs('customer')
    await conversationsService.reportConversation('conv_andrea_serenity', 'They asked for payment by bank transfer.')
    signInAs('admin')
    const cases = await adminService.listCases()
    expect(cases.find((item) => item.conversationId === 'conv_andrea_serenity')).toMatchObject({
      status: 'open',
      reason: 'They asked for payment by bank transfer.',
      reporterSide: 'customer',
    })
  })

  it('takes, notes and resolves a case, keeping the trail', async () => {
    const [first] = await adminService.listCases()
    const id = first?.id ?? ''
    await adminService.takeCase(id)
    await adminService.addCaseNote(id, 'Messaged the shop to ask about the GCash request.')
    const resolved = await adminService.resolveCase(id, 'Shop agreed to take deposits only in person.')

    expect(resolved).toMatchObject({ status: 'resolved', ownerName: 'Mika Santos' })
    expect(resolved.events.map((event) => event.kind)).toEqual(['opened', 'taken', 'note', 'resolved'])
    await expect(adminService.resolveCase(id, 'Again')).rejects.toMatchObject({ status: 409 })
  })
})

describe('categories and featured shops (mock service)', () => {
  it('lists the taxonomy with how much uses each category', async () => {
    const categories = await adminService.listCategories()
    expect(categories.find((category) => category.id === 'cat_barber')).toMatchObject({ name: 'Barber', shopCount: 3 })
    expect(categories.find((category) => category.id === 'sub_haircut')).toMatchObject({ parentId: 'cat_barber' })
    expect(categories.find((category) => category.id === 'sub_haircut')?.serviceCount).toBeGreaterThan(0)
  })

  it('renames and hides a category, which the public catalog then leaves out', async () => {
    await adminService.updateCategory('sub_beard', { name: 'Beard & Shaving', status: 'active' })
    expect((await catalogService.getCategories()).find((category) => category.id === 'sub_beard')?.name).toBe(
      'Beard & Shaving',
    )
    await adminService.updateCategory('sub_beard', { name: 'Beard & Shaving', status: 'hidden' })
    expect((await catalogService.getCategories()).map((category) => category.id)).not.toContain('sub_beard')
    await expect(adminService.updateCategory('sub_beard', { name: ' ', status: 'active' })).rejects.toMatchObject({
      status: 422,
    })
  })

  it('adds a subcategory at the end of its parent', async () => {
    const categories = await adminService.addSubcategory('cat_barber', 'Kids’ Cuts')
    const added = categories.find((category) => category.name === 'Kids’ Cuts')
    expect(added).toMatchObject({ parentId: 'cat_barber', slug: 'kids-cuts', status: 'active', icon: 'barber' })
    const siblings = categories.filter((category) => category.parentId === 'cat_barber')
    expect(siblings.at(-1)?.id).toBe(added?.id)
    await expect(adminService.addSubcategory('cat_barber', 'kids’ cuts')).rejects.toMatchObject({ status: 409 })
  })

  it('reorders categories among their siblings', async () => {
    const top = (list: Awaited<ReturnType<typeof adminService.listCategories>>) =>
      list.filter((category) => !category.parentId).map((category) => category.id)
    const before = top(await adminService.listCategories())
    const after = top(await adminService.moveCategory(before[1] ?? '', 'up'))
    expect(after.slice(0, 2)).toEqual([before[1], before[0]])
  })

  it('features only live shops', async () => {
    await expect(adminService.setFeatured('biz_polished', true)).resolves.toMatchObject({ featured: true })
    expect((await shopsService.getFeaturedShops()).map((shop) => shop.id)).toContain('biz_polished')
    await expect(adminService.setFeatured('biz_kulot', true)).rejects.toMatchObject({ status: 422 })
  })
})

describe('users (mock service)', () => {
  it('looks up accounts by name or email', async () => {
    expect((await adminService.listUsers('andrea')).map((user) => user.email)).toEqual(['customer@example.com'])
    expect((await adminService.listUsers('OWNER@')).map((user) => user.name)).toEqual(['Paolo Mendoza'])
    expect(await adminService.listUsers()).toHaveLength(3)
  })

  it('suspends an account, ending its session and blocking sign-in', async () => {
    const suspended = await adminService.suspendUser(mockUsers.customer.id, 'Repeated no-shows and abuse.')
    expect(suspended).toMatchObject({ suspended: true, suspendedReason: 'Repeated no-shows and abuse.' })

    signInAs('customer')
    expect(await authService.getSession()).toBeNull()
    await expect(
      authService.signIn({ email: mockUsers.customer.email, password: 'password123', remember: false }),
    ).rejects.toMatchObject({ status: 403, message: 'This account is suspended. Contact Dapita support.' })

    signInAs('admin')
    await adminService.reinstateUser(mockUsers.customer.id, 'Spoke with the customer.')
    signInAs('customer')
    expect(await authService.getSession()).toMatchObject({ id: mockUsers.customer.id })
  })

  it('protects administrators and the person acting', async () => {
    await expect(adminService.suspendUser(mockUsers.admin.id, 'Testing myself.')).rejects.toMatchObject({
      status: 409,
      message: 'You can’t suspend your own account.',
    })
    await expect(adminService.suspendUser(mockUsers.merchant.id, '')).rejects.toMatchObject({ status: 422 })
  })
})
