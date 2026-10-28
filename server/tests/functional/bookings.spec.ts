import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  customerEmail,
  goodCutId,
  openSlot,
  ownerEmail,
  recordBroadcasts,
  userByEmail,
} from '#tests/helpers'

test.group('Bookings: customer to shop round trip', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a request reaches the shop, and its answer reaches the customer, live', async ({
    client,
    assert,
  }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    const start = await openSlot('svc_mens_haircut')
    const broadcasts = recordBroadcasts()

    const created = await client
      .post('/api/bookings')
      .header('Idempotency-Key', 'key-1')
      .json({
        serviceId: 'svc_mens_haircut',
        staffId: 'stf_ken',
        start,
        notes: 'Short on the sides',
      })
      .loginAs(customer)
    created.assertStatus(200)
    const booking = created.body()
    assert.equal(booking.status, 'pending')
    assert.equal(booking.start, start)
    assert.equal(booking.staffName, 'Ken')
    assert.exists(booking.respondBy)

    // A retried submit returns the same booking instead of a duplicate.
    const retried = await client
      .post('/api/bookings')
      .header('Idempotency-Key', 'key-1')
      .json({ serviceId: 'svc_mens_haircut', staffId: 'stf_ken', start })
      .loginAs(customer)
    assert.equal(retried.body().id, booking.id)

    const inbox = await client.get(`/api/merchant/businesses/${goodCutId}/bookings`).loginAs(owner)
    inbox.assertStatus(200)
    assert.include(
      inbox.body().map((item: { id: string }) => item.id),
      booking.id
    )

    const accepted = await client.post(`/api/merchant/bookings/${booking.id}/accept`).loginAs(owner)
    accepted.assertStatus(200)
    assert.equal(accepted.body().status, 'confirmed')

    const seen = await client.get(`/api/bookings/${booking.id}`).loginAs(customer)
    assert.equal(seen.body().status, 'confirmed')
    assert.deepEqual(
      seen.body().events.map((event: { action: string }) => event.action),
      ['submit', 'accept']
    )

    broadcasts.stop()
    const event = { type: 'booking.changed', bookingId: booking.id }
    assert.deepInclude(broadcasts.events, { channel: `users/${customer.id}`, payload: event })
    assert.deepInclude(broadcasts.events, { channel: `businesses/${goodCutId}`, payload: event })
  })

  test('a proposed time moves the booking once the customer accepts it', async ({
    client,
    assert,
  }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    const start = await openSlot('svc_mens_haircut', 4)
    const later = await openSlot('svc_mens_haircut', 30)

    const created = await client
      .post('/api/bookings')
      .json({ serviceId: 'svc_mens_haircut', staffId: null, start })
      .loginAs(customer)
    const id = created.body().id

    const proposed = await client
      .post(`/api/merchant/bookings/${id}/propose`)
      .json({ start: later, message: 'Fully booked then, how about this?' })
      .loginAs(owner)
    proposed.assertStatus(200)
    assert.equal(proposed.body().status, 'alternative_proposed')
    assert.equal(proposed.body().proposal?.start, later)

    const accepted = await client.post(`/api/bookings/${id}/accept-alternative`).loginAs(customer)
    accepted.assertStatus(200)
    assert.equal(accepted.body().status, 'confirmed')
    assert.equal(accepted.body().start, later)
    assert.notExists(accepted.body().proposal)
  })

  test('invalid moves are refused by the shared state machine', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    const start = await openSlot('svc_hot_shave', 5)
    const created = await client
      .post('/api/bookings')
      .json({ serviceId: 'svc_hot_shave', staffId: null, start })
      .loginAs(customer)
    const id = created.body().id

    await client
      .post(`/api/merchant/bookings/${id}/decline`)
      .json({ reason: 'Closed' })
      .loginAs(owner)
    const acceptAfterDecline = await client
      .post(`/api/merchant/bookings/${id}/accept`)
      .loginAs(owner)
    acceptAfterDecline.assertStatus(409)
    acceptAfterDecline.assertBodyContains({ code: 'invalid_transition' })
  })

  test('times outside opening hours are refused', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const day = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    day.setUTCHours(18, 0, 0, 0) // 02:00 in Davao, when the shop is closed
    const response = await client
      .post('/api/bookings')
      .json({ serviceId: 'svc_mens_haircut', staffId: null, start: day.toISOString() })
      .loginAs(customer)
    response.assertStatus(422)
    response.assertBodyContains({
      message: 'The shop isn’t open for this service at that time. Choose another time.',
    })
  })
})

test.group('Bookings: privacy', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('requires a session', async ({ client }) => {
    const response = await client.get('/api/me/bookings')
    response.assertStatus(401)
    response.assertBodyContains({ message: 'Sign in to continue.' })
  })

  test('other customers and other shops cannot see a booking', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const stranger = await userByEmail('john@example.com')
    const otherOwner = await userByEmail('owner.kulot-studio@example.com')
    const start = await openSlot('svc_mens_haircut', 6)
    const created = await client
      .post('/api/bookings')
      .json({ serviceId: 'svc_mens_haircut', staffId: null, start })
      .loginAs(customer)
    const id = created.body().id

    const asStranger = await client.get(`/api/bookings/${id}`).loginAs(stranger)
    asStranger.assertStatus(404)

    const asOtherShop = await client.get(`/api/merchant/bookings/${id}`).loginAs(otherOwner)
    asOtherShop.assertStatus(404)

    const otherShopsList = await client
      .get(`/api/merchant/businesses/${goodCutId}/bookings`)
      .loginAs(otherOwner)
    otherShopsList.assertStatus(403)
  })

  test('a shop owner cannot book as the merchant', async ({ client }) => {
    const admin = await userByEmail('admin@example.com')
    const start = await openSlot('svc_mens_haircut', 7)
    const response = await client
      .post('/api/bookings')
      .json({ serviceId: 'svc_mens_haircut', staffId: null, start })
      .loginAs(admin)
    response.assertStatus(403)
  })

  test('a shop owner can book other shops but not their own', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const ownShop = await client
      .post('/api/bookings')
      .json({
        serviceId: 'svc_mens_haircut',
        staffId: null,
        start: await openSlot('svc_mens_haircut'),
      })
      .loginAs(owner)
    ownShop.assertStatus(422)
    ownShop.assertBodyContains({ message: 'You can’t book your own business.' })

    const otherShop = await client
      .post('/api/bookings')
      .json({ serviceId: 'svc_gg_cut', staffId: null, start: await openSlot('svc_gg_cut') })
      .loginAs(owner)
    otherShop.assertStatus(200)
    assert.equal(otherShop.body().status, 'pending')
  })
})

// The groups above run inside one wrapping transaction. The live server doesn't, so
// this group runs the merchant's answers for real, with their own transactions.
test.group('Bookings: without a wrapping transaction', () => {
  test('the shop can answer a request', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    const start = await openSlot('svc_kids_cut', 72)

    const created = await client
      .post('/api/bookings')
      .json({ serviceId: 'svc_kids_cut', staffId: null, start })
      .loginAs(customer)
    created.assertStatus(200)

    const accepted = await client
      .post(`/api/merchant/bookings/${created.body().id}/accept`)
      .loginAs(owner)
    accepted.assertStatus(200)
    assert.equal(accepted.body().status, 'confirmed')
  }).timeout(5000)
})
