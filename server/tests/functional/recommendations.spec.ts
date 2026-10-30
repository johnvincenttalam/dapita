import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import DeletionRequest from '#models/deletion_request'
import type User from '#models/user'
import { customerEmail, goodCutId, ownerEmail, userByEmail } from '#tests/helpers'
import type { Recommendation } from '#shared/domain'

async function recommendations(client: ApiClient, user?: User) {
  const request = client.get('/api/recommendations')
  const response = await (user ? request.loginAs(user) : request)
  response.assertStatus(200)
  return response.body() as Recommendation[]
}

const reasonOf = (list: Recommendation[], businessId: string) =>
  list.find((entry) => entry.shop.id === businessId)?.reason

test.group('Recommendations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('guests get shops with popular or none reasons and no similar_customers', async ({
    client,
    assert,
  }) => {
    const list = await recommendations(client)
    assert.isAbove(list.length, 0)
    assert.isTrue(list.every((entry) => entry.reason === 'popular' || entry.reason === 'none'))
    assert.equal(reasonOf(list, goodCutId), 'popular')
  })

  test('the demo customer gets Clearday as similar_customers and never her booked or saved shops', async ({
    client,
    assert,
  }) => {
    const list = await recommendations(client, await userByEmail(customerEmail))
    assert.equal(reasonOf(list, 'biz_clearday'), 'similar_customers')
    const ids = list.map((entry) => entry.shop.id)
    for (const id of [
      'biz_good_cut',
      'biz_serenity',
      'biz_glow_go',
      'biz_polished',
      'biz_hilot',
      'biz_bloom',
      'biz_arch_lash',
      'biz_kulot',
      'biz_ritz_grooming',
    ]) {
      assert.notInclude(ids, id)
    }
  })

  test('the owner never gets their own shop', async ({ client, assert }) => {
    const list = await recommendations(client, await userByEmail(ownerEmail))
    assert.notInclude(
      list.map((entry) => entry.shop.id),
      goodCutId
    )
  })

  test('a customer with a deletion request is not counted', async ({ client, assert }) => {
    await DeletionRequest.create({
      id: 'del_test_john',
      userId: 'usr_john',
      status: 'received',
      requestedAt: new Date().toISOString(),
    })
    const list = await recommendations(client, await userByEmail(customerEmail))
    assert.notEqual(reasonOf(list, 'biz_clearday'), 'similar_customers')
  })

  test('the body holds no user ids', async ({ client, assert }) => {
    const user = await userByEmail(customerEmail)
    const body = JSON.stringify(await recommendations(client, user))
    for (const id of ['usr_john', 'usr_mark', 'usr_alyssa', user.id]) assert.notInclude(body, id)
  })
})
