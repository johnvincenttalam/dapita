import { test } from '@japa/runner'
import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import Business from '#models/business'
import { customerEmail, ownerEmail, userByEmail } from '#tests/helpers'
import type { SessionUser } from '#shared/domain'

test.group('Auth', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the session is null when signed out', async ({ client, assert }) => {
    const response = await client.get('/api/auth/session')
    response.assertStatus(200)
    assert.isNull(response.body())
  })

  test('signs in with the demo password and sets an httpOnly session cookie', async ({
    client,
    assert,
  }) => {
    const signIn = await client
      .post('/api/auth/sign-in')
      .json({ email: ownerEmail, password: 'password123' })
    signIn.assertStatus(200)
    assert.deepInclude(signIn.body().memberships, {
      businessId: 'biz_good_cut',
      businessName: 'The Good Cut Barbershop',
      role: 'owner',
    })
    assert.match(String(signIn.header('set-cookie')), /adonis-session=.*HttpOnly/)
  })

  test('the session returns the signed-in user', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const session = await client.get('/api/auth/session').loginAs(owner)
    session.assertStatus(200)
    assert.equal((session.body() as SessionUser).email, ownerEmail)
  })

  test('rejects a wrong password with the message the form shows', async ({ client }) => {
    const response = await client
      .post('/api/auth/sign-in')
      .json({ email: customerEmail, password: 'wrong-password1' })
    response.assertStatus(401)
    response.assertBodyContains({ message: 'Incorrect email or password.' })
  })

  test('signs up a business owner with a private draft listing', async ({ client, assert }) => {
    const response = await client.post('/api/auth/sign-up').json({
      accountType: 'business',
      name: 'Lea Cruz',
      email: 'Lea@Example.com',
      phone: '0917 123 4567',
      password: 'nails2026',
      businessName: 'Lea’s Nail Bar',
      consents: [
        { purpose: 'terms', version: 'draft-2026-10' },
        { purpose: 'privacy_notice', version: 'draft-2026-10' },
        { purpose: 'merchant_policy', version: 'draft-2026-10' },
      ],
    })
    response.assertStatus(200)
    const user = response.body()
    assert.equal(user.email, 'lea@example.com')
    assert.deepEqual(user.roles, ['customer', 'merchant_owner'])
    assert.equal(user.memberships[0].businessName, 'Lea’s Nail Bar')
    assert.isFalse(user.emailVerified)
    // The owner's number is offered as the shop's contact number in onboarding.
    const business = await Business.findOrFail(user.memberships[0].businessId)
    assert.equal(business.status, 'draft')
    assert.isNotNull(business.phone)

    const again = await client.post('/api/auth/sign-up').json({
      accountType: 'customer',
      name: 'Someone',
      email: 'lea@example.com',
      password: 'nails2026',
      consents: [{ purpose: 'terms', version: 'draft-2026-10' }],
    })
    again.assertStatus(409)
    again.assertBodyContains({ code: 'email_taken' })
  })

  test('answers 501 for endpoints the server does not implement yet', async ({ client }) => {
    const response = await client.get('/api/not-a-real-endpoint')
    response.assertStatus(501)
    response.assertBodyContains({ code: 'not_implemented' })
  })
})

test.group('Realtime routes', () => {
  test('the event stream routes are reachable, not shadowed by the 501 catch-all', async ({
    client,
  }) => {
    // Subscribing needs a session, so an anonymous request gets 401 (not 501).
    const response = await client
      .post('/api/__transmit/subscribe')
      .json({ uid: 'test-uid', channel: 'users/usr_customer' })
    response.assertStatus(401)
  })

  test('each user may only listen on their own channel and their businesses’', async ({
    assert,
  }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    const canListen = (user: unknown, channel: string) =>
      transmit.getManager().verifyAccess(channel, { auth: { user } } as unknown as HttpContext)

    assert.isTrue(await canListen(customer, `users/${customer.id}`))
    assert.isFalse(await canListen(customer, `users/${owner.id}`))
    assert.isFalse(await canListen(customer, 'businesses/biz_good_cut'))
    assert.isTrue(await canListen(owner, 'businesses/biz_good_cut'))
    assert.isFalse(await canListen(owner, 'businesses/biz_kulot'))
    assert.isFalse(await canListen(undefined, `users/${customer.id}`))
  })
})
