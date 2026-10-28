import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import type User from '#models/user'
import { customerEmail, goodCutId, ownerEmail, userByEmail } from '#tests/helpers'
import type { ShopSummary } from '#shared/domain'

/** The saved shops' ids, in the order the API lists them. */
async function savedIds(client: ApiClient, user: User) {
  const response = await client.get('/api/me/favorites').loginAs(user)
  response.assertStatus(200)
  return (response.body() as ShopSummary[]).map((shop) => shop.id)
}

const save = (client: ApiClient, user: User, businessId: string) =>
  client.put(`/api/me/favorites/${businessId}`).loginAs(user)

const remove = (client: ApiClient, user: User, businessId: string) =>
  client.delete(`/api/me/favorites/${businessId}`).loginAs(user)

test.group('Favorites: saved shops', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('requires a session', async ({ client }) => {
    const response = await client.get('/api/me/favorites')
    response.assertStatus(401)
  })

  test('saves shops newest first, ignores a second save and removes them', async ({
    client,
    assert,
  }) => {
    const customer = await userByEmail(customerEmail)
    assert.deepEqual(await savedIds(client, customer), [])

    const first = await save(client, customer, goodCutId)
    first.assertStatus(204)
    await save(client, customer, 'biz_glow_go')
    const again = await save(client, customer, goodCutId)
    again.assertStatus(204)
    assert.deepEqual(await savedIds(client, customer), ['biz_glow_go', goodCutId])

    const removed = await remove(client, customer, goodCutId)
    removed.assertStatus(204)
    // Removing one that isn't saved is not an error.
    const removedAgain = await remove(client, customer, goodCutId)
    removedAgain.assertStatus(204)
    assert.deepEqual(await savedIds(client, customer), ['biz_glow_go'])
  })

  test('keeps each customer’s list private', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    await save(client, customer, 'biz_glow_go')
    assert.deepEqual(await savedIds(client, owner), [])
  })

  test('refuses shops that aren’t public and the owner’s own business', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)
    const admin = await userByEmail('admin@example.com')

    const unlisted = await save(client, customer, 'biz_kulot')
    unlisted.assertStatus(404)

    const ownShop = await save(client, owner, goodCutId)
    ownShop.assertStatus(422)
    ownShop.assertBodyContains({ message: 'You can’t save your own business.' })

    const asAdmin = await save(client, admin, 'biz_glow_go')
    asAdmin.assertStatus(403)
  })
})
