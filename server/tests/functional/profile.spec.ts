import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { customerEmail, ownerEmail, userByEmail } from '#tests/helpers'
import type { ConsentRecord, MyProfile, SessionUser } from '#shared/domain'

test.group('Account: profile, consents and deletion requests', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('returns the signed-in user’s own profile', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const response = await client.get('/api/me/profile').loginAs(customer)
    response.assertStatus(200)
    const profile = response.body() as MyProfile
    assert.equal(profile.id, customer.id)
    assert.equal(profile.name, 'Andrea Reyes')
    assert.equal(profile.email, customerEmail)
    assert.isTrue(profile.emailVerified)
    assert.exists(profile.createdAt)
    assert.notExists(profile.phone)
    assert.notExists(profile.deletionRequest)
  })

  test('saves the name and a normalised mobile number, and clears it again', async ({
    client,
    assert,
  }) => {
    const customer = await userByEmail(customerEmail)

    const saved = await client
      .put('/api/me/profile')
      .json({ name: '  Andrea R. Reyes ', phone: '0917 123-4567' })
      .loginAs(customer)
    saved.assertStatus(200)
    assert.include(saved.body() as MyProfile, { name: 'Andrea R. Reyes', phone: '09171234567' })

    const session = await client.get('/api/auth/session').loginAs(customer)
    assert.equal((session.body() as SessionUser).name, 'Andrea R. Reyes')

    const cleared = await client
      .put('/api/me/profile')
      .json({ name: 'Andrea Reyes', phone: '' })
      .loginAs(customer)
    cleared.assertStatus(200)
    assert.notExists((cleared.body() as MyProfile).phone)
  })

  test('rejects an invalid profile with the form’s own messages', async ({ client }) => {
    const customer = await userByEmail(customerEmail)

    const noName = await client
      .put('/api/me/profile')
      .json({ name: '   ', phone: '' })
      .loginAs(customer)
    noName.assertStatus(422)
    noName.assertBodyContains({ message: 'Your name is required', code: 'validation' })

    const badPhone = await client
      .put('/api/me/profile')
      .json({ name: 'Andrea Reyes', phone: '12345' })
      .loginAs(customer)
    badPhone.assertStatus(422)
    badPhone.assertBodyContains({
      message: 'Enter a mobile number like 0917 123 4567',
      details: { phone: ['Enter a mobile number like 0917 123 4567'] },
    })
  })

  test('lists only the user’s own consents', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const response = await client.get('/api/me/consents').loginAs(owner)
    response.assertStatus(200)
    const consents = response.body() as ConsentRecord[]
    assert.isNotEmpty(consents)
    assert.includeMembers(
      consents.map((consent) => consent.purpose),
      ['terms', 'privacy_notice', 'merchant_policy']
    )
    for (const consent of consents) {
      assert.exists(consent.version)
      assert.exists(consent.grantedAt)
    }
  })

  test('records one deletion request and shows it on the profile', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)

    const first = await client.post('/api/me/deletion-request').loginAs(customer)
    first.assertStatus(200)
    const request = first.body()
    assert.match(request.id, /^del_/)
    assert.equal(request.status, 'received')

    const again = await client.post('/api/me/deletion-request').loginAs(customer)
    assert.deepEqual(again.body(), request)

    const profile = await client.get('/api/me/profile').loginAs(customer)
    assert.deepEqual((profile.body() as MyProfile).deletionRequest, request)

    // Another account's profile is unaffected.
    const owner = await userByEmail(ownerEmail)
    const ownerProfile = await client.get('/api/me/profile').loginAs(owner)
    assert.notExists((ownerProfile.body() as MyProfile).deletionRequest)
  })

  test('needs a signed-in user', async ({ client }) => {
    const profile = await client.get('/api/me/profile')
    profile.assertStatus(401)
    const update = await client.put('/api/me/profile').json({ name: 'Someone', phone: '' })
    update.assertStatus(401)
    const consents = await client.get('/api/me/consents')
    consents.assertStatus(401)
    const deletion = await client.post('/api/me/deletion-request')
    deletion.assertStatus(401)
  })
})
