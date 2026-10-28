import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { customerEmail, goodCutId, ownerEmail, userByEmail } from '#tests/helpers'
import type { CaseDetails, CaseListItem } from '#shared/domain'

const adminEmail = 'admin@example.com'

test.group('Support requests', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a request about a booking opens a case staff can see and work', async ({
    client,
    assert,
  }) => {
    const customer = await userByEmail(customerEmail)
    const sent = await client
      .post('/api/support/requests')
      .json({
        topic: 'booking',
        bookingId: 'bk_andrea_completed',
        message: 'The shop charged ₱200 more than the listed price.',
      })
      .loginAs(customer)
    sent.assertStatus(201)
    const { id } = sent.body() as { id: string }

    const admin = await userByEmail(adminEmail)
    const list = await client.get('/api/admin/cases').loginAs(admin)
    const item = (list.body() as CaseListItem[]).find((candidate) => candidate.id === id)!
    assert.include(item, {
      kind: 'booking',
      status: 'open',
      reason: 'The shop charged ₱200 more than the listed price.',
      reporterName: 'Andrea Reyes',
      reporterSide: 'customer',
      bookingId: 'bk_andrea_completed',
      businessName: 'Polished Nail Studio',
    })
    assert.notProperty(item, 'conversationId')

    const details = await client.get(`/api/admin/cases/${id}`).loginAs(admin)
    details.assertStatus(200)
    const body = details.body() as CaseDetails
    assert.equal(body.reporterEmail, customerEmail)
    assert.deepEqual(body.messages, [])
    assert.include(body.booking!, { reference: 'DP-2HF6NC', status: 'completed' })

    const resolved = await client
      .post(`/api/admin/cases/${id}/resolve`)
      .json({ resolution: 'Shop refunded the difference.' })
      .loginAs(admin)
    resolved.assertStatus(200)
  })

  test('reports only live listings, and needs to know which', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const live = await client
      .post('/api/support/requests')
      .json({
        topic: 'listing',
        businessId: goodCutId,
        message: 'The haircut price is out of date.',
      })
      .loginAs(customer)
    live.assertStatus(201)

    const pending = await client
      .post('/api/support/requests')
      .json({ topic: 'listing', businessId: 'biz_kulot', message: 'This shop isn’t live yet.' })
      .loginAs(customer)
    pending.assertStatus(404)

    const unnamed = await client
      .post('/api/support/requests')
      .json({ topic: 'listing', message: 'Which shop? I didn’t say.' })
      .loginAs(customer)
    unnamed.assertStatus(422)
    assert.property(unnamed.body().details, 'businessId')
  })

  test('only the booking’s customer or its shop can ask about it', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const other = await client
      .post('/api/support/requests')
      .json({ topic: 'booking', bookingId: 'bk_gc_john', message: 'Not my booking at all.' })
      .loginAs(customer)
    other.assertStatus(404)

    const owner = await userByEmail(ownerEmail)
    const shop = await client
      .post('/api/support/requests')
      .json({
        topic: 'booking',
        bookingId: 'bk_gc_john',
        message: 'This customer keeps booking and not arriving.',
      })
      .loginAs(owner)
    shop.assertStatus(201)
    const admin = await userByEmail(adminEmail)
    const details = await client
      .get(`/api/admin/cases/${(shop.body() as { id: string }).id}`)
      .loginAs(admin)
    assert.equal((details.body() as CaseDetails).reporterSide, 'business')
  })

  test('needs a session, a real message and a short queue', async ({ client }) => {
    const guest = await client
      .post('/api/support/requests')
      .json({ topic: 'account', message: 'Please send me my data.' })
    guest.assertStatus(401)

    const customer = await userByEmail(customerEmail)
    const short = await client
      .post('/api/support/requests')
      .json({ topic: 'other', message: 'Help' })
      .loginAs(customer)
    short.assertStatus(422)
    short.assertBodyContains({ message: 'Tell us what happened in at least 10 characters' })

    for (let index = 0; index < 5; index++) {
      const sent = await client
        .post('/api/support/requests')
        .json({ topic: 'other', message: `Question number ${index + 1} for you.` })
        .loginAs(customer)
      sent.assertStatus(201)
    }
    const sixth = await client
      .post('/api/support/requests')
      .json({ topic: 'other', message: 'One more question for you.' })
      .loginAs(customer)
    sixth.assertStatus(429)
  })
})
