import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { newId } from '#helpers/ids'
import { customerEmail, goodCutId, ownerEmail, userByEmail } from '#tests/helpers'
import type {
  AdminCategory,
  AdminUser,
  CaseDetails,
  CaseListItem,
  ConversationSummary,
  MerchantListItem,
  MerchantReview,
  UserRole,
} from '#shared/domain'

const adminEmail = 'admin@example.com'
const kulotId = 'biz_kulot'

/** A staff account that isn't in the demo data, e.g. support. */
async function staffMember(roles: UserRole[]) {
  const now = new Date().toISOString()
  return User.create({
    id: newId('usr'),
    name: 'Sam Support',
    email: `${newId('staff')}@example.com`.toLowerCase(),
    password: 'password123',
    phone: null,
    roles,
    emailVerifiedAt: now,
    suspendedAt: null,
    createdAt: now,
    updatedAt: now,
  })
}

test.group('Admin: listing review and moderation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists every listing, newest change first, with names and counts', async ({
    client,
    assert,
  }) => {
    const admin = await userByEmail(adminEmail)
    const response = await client.get('/api/admin/merchants').loginAs(admin)
    response.assertStatus(200)
    const items = response.body() as MerchantListItem[]
    assert.lengthOf(items, 13)
    assert.deepEqual(
      items.map((item) => item.updatedAt),
      items
        .map((item) => item.updatedAt)
        .toSorted()
        .toReversed()
    )
    const goodCut = items.find((item) => item.id === goodCutId)!
    assert.include(goodCut, {
      name: 'The Good Cut Barbershop',
      status: 'approved',
      ownerName: 'Paolo Mendoza',
      serviceCount: 6,
      featured: true,
    })
    assert.deepEqual(goodCut.categoryNames, ['Barber'])
    assert.isNotEmpty(goodCut.areaName)
  })

  test('approving a listing records why and makes it public', async ({ client, assert }) => {
    const admin = await userByEmail(adminEmail)

    const review = await client.get(`/api/admin/merchants/${kulotId}`).loginAs(admin)
    review.assertStatus(200)
    const before = review.body() as MerchantReview
    assert.equal(before.business.status, 'pending_review')
    assert.deepEqual(before.availableActions, ['approve', 'request_changes', 'reject'])
    assert.isEmpty(before.history)
    assert.isNotEmpty(before.services)

    const approved = await client
      .post(`/api/admin/merchants/${kulotId}/moderation`)
      .json({ action: 'approve', reason: 'Details and photos check out.' })
      .loginAs(admin)
    approved.assertStatus(200)
    const after = approved.body() as MerchantReview
    assert.equal(after.business.status, 'approved')
    assert.notExists(after.business.moderationNote)
    assert.deepEqual(after.availableActions, ['suspend'])
    assert.lengthOf(after.history, 1)
    assert.include(after.history[0], {
      action: 'approve',
      from: 'pending_review',
      to: 'approved',
      reason: 'Details and photos check out.',
      actorName: admin.name,
    })

    const shop = await client.get(`/api/shops/${after.business.slug}`)
    shop.assertStatus(200)
  })

  test('sending a listing back shows the owner why, and wrong-state decisions are refused', async ({
    client,
    assert,
  }) => {
    const admin = await userByEmail(adminEmail)

    const sentBack = await client
      .post(`/api/admin/merchants/${kulotId}/moderation`)
      .json({ action: 'request_changes', reason: 'Add a photo of the shop front.' })
      .loginAs(admin)
    sentBack.assertStatus(200)

    const owner = await userByEmail('owner.kulot-studio@example.com')
    const listing = await client.get(`/api/merchant/businesses/${kulotId}`).loginAs(owner)
    assert.include(listing.body().business, {
      status: 'changes_requested',
      moderationNote: 'Add a photo of the shop front.',
    })

    const live = await client
      .post(`/api/admin/merchants/${goodCutId}/moderation`)
      .json({ action: 'approve', reason: 'Approve it again.' })
      .loginAs(admin)
    live.assertStatus(409)
    live.assertBodyContains({ message: 'This listing can’t be approved while it’s live.' })

    const noReason = await client
      .post(`/api/admin/merchants/${goodCutId}/moderation`)
      .json({ action: 'suspend', reason: 'No' })
      .loginAs(admin)
    noReason.assertStatus(422)
    noReason.assertBodyContains({ message: 'Give a reason of at least 5 characters' })
  })

  test('features live listings only', async ({ client, assert }) => {
    const admin = await userByEmail(adminEmail)

    const off = await client
      .put(`/api/admin/merchants/${goodCutId}/featured`)
      .json({ featured: false })
      .loginAs(admin)
    off.assertStatus(200)
    assert.isFalse((off.body() as MerchantListItem).featured)

    const pending = await client
      .put(`/api/admin/merchants/${kulotId}/featured`)
      .json({ featured: true })
      .loginAs(admin)
    pending.assertStatus(422)
    pending.assertBodyContains({ message: 'Only live listings can be featured.' })
  })

  test('is for administrators only', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const support = await staffMember(['support'])

    const asCustomer = await client.get('/api/admin/merchants').loginAs(customer)
    asCustomer.assertStatus(403)
    asCustomer.assertBodyContains({ message: 'This is for Dapita staff only.' })
    const asSupport = await client
      .post(`/api/admin/merchants/${kulotId}/moderation`)
      .json({ action: 'approve', reason: 'Looks fine to me.' })
      .loginAs(support)
    asSupport.assertStatus(403)
    const signedOut = await client.get('/api/admin/merchants')
    signedOut.assertStatus(401)
  })
})

test.group('Admin: support cases', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /** A customer reports a conversation with the Good Cut, which opens a case. */
  async function openCase(client: ApiClient) {
    const customer = await userByEmail(customerEmail)
    const started = await client
      .post('/api/conversations')
      .json({ businessId: goodCutId })
      .loginAs(customer)
    const conversationId = (started.body() as ConversationSummary).id
    await client
      .post(`/api/conversations/${conversationId}/messages`)
      .json({ body: 'Why was my booking declined?' })
      .loginAs(customer)
    const reported = await client
      .post(`/api/conversations/${conversationId}/report`)
      .json({ reason: 'The shop replied rudely.' })
      .loginAs(customer)
    reported.assertStatus(204)
    return conversationId
  }

  test('support staff take, note and resolve a reported conversation', async ({
    client,
    assert,
  }) => {
    const conversationId = await openCase(client)
    const support = await staffMember(['support'])

    const list = await client.get('/api/admin/cases').loginAs(support)
    list.assertStatus(200)
    const item = (list.body() as CaseListItem[]).find(
      (candidate) => candidate.conversationId === conversationId
    )!
    assert.include(item, {
      kind: 'message',
      status: 'open',
      reason: 'The shop replied rudely.',
      reporterName: 'Andrea Reyes',
      reporterSide: 'customer',
      customerName: 'Andrea Reyes',
      businessName: 'The Good Cut Barbershop',
    })

    const details = await client.get(`/api/admin/cases/${item.id}`).loginAs(support)
    details.assertStatus(200)
    const before = details.body() as CaseDetails
    assert.equal(before.businessId, goodCutId)
    assert.equal(before.reporterEmail, customerEmail)
    assert.equal(before.messages.at(-1)?.body, 'Why was my booking declined?')
    assert.deepEqual(
      before.events.map((event) => event.kind),
      ['opened']
    )

    const taken = await client.post(`/api/admin/cases/${item.id}/take`).loginAs(support)
    taken.assertStatus(200)
    assert.include(taken.body() as CaseDetails, {
      status: 'in_progress',
      ownerName: 'Sam Support',
    })

    const shortNote = await client
      .post(`/api/admin/cases/${item.id}/notes`)
      .json({ text: 'ok' })
      .loginAs(support)
    shortNote.assertStatus(422)
    shortNote.assertBodyContains({ message: 'Write a note of at least 5 characters.' })

    const noted = await client
      .post(`/api/admin/cases/${item.id}/notes`)
      .json({ text: 'Called the shop about it.' })
      .loginAs(support)
    noted.assertStatus(200)

    const resolved = await client
      .post(`/api/admin/cases/${item.id}/resolve`)
      .json({ resolution: 'Shop apologised; no further action.' })
      .loginAs(support)
    resolved.assertStatus(200)
    const after = resolved.body() as CaseDetails
    assert.equal(after.status, 'resolved')
    assert.deepEqual(
      after.events.map((event) => event.kind),
      ['opened', 'taken', 'note', 'resolved']
    )
    assert.equal(after.events.at(-1)?.text, 'Shop apologised; no further action.')

    const again = await client.post(`/api/admin/cases/${item.id}/take`).loginAs(support)
    again.assertStatus(409)
    again.assertBodyContains({ message: 'This case is already resolved.' })
  })

  test('lists open cases before resolved ones; customers can’t see them', async ({
    client,
    assert,
  }) => {
    await openCase(client)
    const admin = await userByEmail(adminEmail)
    const list = await client.get('/api/admin/cases').loginAs(admin)
    const statuses = (list.body() as CaseListItem[]).map((item) => item.status)
    const rank = { open: 0, in_progress: 1, resolved: 2 }
    assert.deepEqual(
      statuses,
      statuses.toSorted((a, b) => rank[a] - rank[b])
    )

    const customer = await userByEmail(customerEmail)
    const asCustomer = await client.get('/api/admin/cases').loginAs(customer)
    asCustomer.assertStatus(403)
    const missing = await client.get('/api/admin/cases/case_nope').loginAs(admin)
    missing.assertStatus(404)
  })
})

test.group('Admin: categories', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists the taxonomy with how much uses each category', async ({ client, assert }) => {
    const admin = await userByEmail(adminEmail)
    const response = await client.get('/api/admin/categories').loginAs(admin)
    response.assertStatus(200)
    const categories = response.body() as AdminCategory[]
    const barber = categories.find((category) => category.id === 'cat_barber')!
    const haircut = categories.find((category) => category.id === 'sub_haircut')!
    assert.isAbove(barber.shopCount, 0)
    assert.isAbove(haircut.serviceCount, 0)
    assert.deepEqual(
      categories.map((category) => category.sortOrder),
      categories.map((category) => category.sortOrder).toSorted((a, b) => a - b)
    )
  })

  test('renames, hides, adds and reorders categories', async ({ client, assert }) => {
    const admin = await userByEmail(adminEmail)

    const renamed = await client
      .put('/api/admin/categories/sub_beard')
      .json({ name: '  Beard   Care ', status: 'hidden' })
      .loginAs(admin)
    renamed.assertStatus(200)
    assert.include(
      (renamed.body() as AdminCategory[]).find((category) => category.id === 'sub_beard'),
      { name: 'Beard Care', status: 'hidden' }
    )

    const clash = await client
      .put('/api/admin/categories/sub_beard')
      .json({ name: 'haircut', status: 'active' })
      .loginAs(admin)
    clash.assertStatus(409)
    clash.assertBodyContains({ message: 'There’s already a category called “Haircut” here.' })

    const added = await client
      .post('/api/admin/categories')
      .json({ parentId: 'cat_barber', name: 'Scalp Care' })
      .loginAs(admin)
    added.assertStatus(200)
    const scalp = (added.body() as AdminCategory[]).find(
      (category) => category.name === 'Scalp Care'
    )!
    assert.include(scalp, {
      parentId: 'cat_barber',
      slug: 'scalp-care',
      status: 'active',
      icon: 'barber',
    })

    const duplicate = await client
      .post('/api/admin/categories')
      .json({ parentId: 'cat_barber', name: 'scalp care' })
      .loginAs(admin)
    duplicate.assertStatus(409)
    duplicate.assertBodyContains({ message: 'Barber already has “Scalp Care”.' })

    const notTop = await client
      .post('/api/admin/categories')
      .json({ parentId: 'sub_haircut', name: 'Fades' })
      .loginAs(admin)
    notTop.assertStatus(422)

    const moved = await client
      .post('/api/admin/categories/cat_salon/move')
      .json({ direction: 'up' })
      .loginAs(admin)
    moved.assertStatus(200)
    const top = (moved.body() as AdminCategory[]).filter((category) => !category.parentId)
    assert.deepEqual(
      top.slice(0, 2).map((category) => category.id),
      ['cat_salon', 'cat_barber']
    )
  })

  test('is for administrators only', async ({ client }) => {
    const support = await staffMember(['support'])
    const response = await client.get('/api/admin/categories').loginAs(support)
    response.assertStatus(403)
  })
})

test.group('Admin: accounts', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('finds accounts by name or email', async ({ client, assert }) => {
    const support = await staffMember(['support'])
    const response = await client.get('/api/admin/users').qs({ q: 'GOOD-CUT' }).loginAs(support)
    response.assertStatus(200)
    const byEmail = await client.get('/api/admin/users').qs({ q: 'andrea' }).loginAs(support)
    const found = byEmail.body() as AdminUser[]
    assert.lengthOf(found, 1)
    assert.include(found[0], { email: customerEmail, suspended: false, emailVerified: true })

    const owner = await client.get('/api/admin/users').qs({ q: ownerEmail }).loginAs(support)
    assert.deepEqual((owner.body() as AdminUser[])[0].businessNames, ['The Good Cut Barbershop'])

    const literal = await client.get('/api/admin/users').qs({ q: '%' }).loginAs(support)
    assert.isEmpty(literal.body())
  })

  test('a suspension ends the account’s session at once, and reinstating restores it', async ({
    client,
    assert,
  }) => {
    const admin = await userByEmail(adminEmail)
    const customer = await userByEmail(customerEmail)

    const shortReason = await client
      .post(`/api/admin/users/${customer.id}/suspend`)
      .json({ reason: 'spam' })
      .loginAs(admin)
    shortReason.assertStatus(422)
    shortReason.assertBodyContains({ message: 'Write a reason of at least 5 characters.' })

    const suspended = await client
      .post(`/api/admin/users/${customer.id}/suspend`)
      .json({ reason: 'Repeated no-shows reported by shops.' })
      .loginAs(admin)
    suspended.assertStatus(200)
    assert.include(suspended.body() as AdminUser, {
      suspended: true,
      suspendedReason: 'Repeated no-shows reported by shops.',
    })

    const blocked = await client.get('/api/me/bookings').loginAs(customer)
    blocked.assertStatus(403)
    blocked.assertBodyContains({ message: 'This account is suspended. Contact Dapita support.' })

    const twice = await client
      .post(`/api/admin/users/${customer.id}/suspend`)
      .json({ reason: 'Repeated no-shows reported by shops.' })
      .loginAs(admin)
    twice.assertStatus(409)

    const reinstated = await client
      .post(`/api/admin/users/${customer.id}/reinstate`)
      .json({ reason: 'Spoke with the customer; resolved.' })
      .loginAs(admin)
    reinstated.assertStatus(200)
    const user = reinstated.body() as AdminUser
    assert.isFalse(user.suspended)
    assert.notExists(user.suspendedReason)
    assert.deepEqual(
      user.history.map((entry) => entry.action),
      ['reinstate', 'suspend']
    )

    const back = await client.get('/api/me/bookings').loginAs(customer)
    back.assertStatus(200)
  })

  test('administrators can’t be suspended, and support staff can’t suspend', async ({ client }) => {
    const admin = await userByEmail(adminEmail)
    const support = await staffMember(['support'])
    const otherAdmin = await staffMember(['admin'])
    const customer = await userByEmail(customerEmail)

    const self = await client
      .post(`/api/admin/users/${admin.id}/suspend`)
      .json({ reason: 'Testing my own account.' })
      .loginAs(admin)
    self.assertStatus(409)
    self.assertBodyContains({ message: 'You can’t suspend your own account.' })

    const anotherAdmin = await client
      .post(`/api/admin/users/${otherAdmin.id}/suspend`)
      .json({ reason: 'Testing another admin.' })
      .loginAs(admin)
    anotherAdmin.assertStatus(403)

    const bySupport = await client
      .post(`/api/admin/users/${customer.id}/suspend`)
      .json({ reason: 'Support should not do this.' })
      .loginAs(support)
    bySupport.assertStatus(403)

    const notSuspended = await client
      .post(`/api/admin/users/${customer.id}/reinstate`)
      .json({ reason: 'Nothing to reinstate.' })
      .loginAs(admin)
    notSuspended.assertStatus(409)
    notSuspended.assertBodyContains({ message: 'This account isn’t suspended.' })
  })
})
