import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import testUtils from '@adonisjs/core/services/test_utils'
import Category from '#models/category'
import type User from '#models/user'
import { customerEmail, userByEmail } from '#tests/helpers'

const get = (client: ApiClient, user: User) => client.get('/api/me/interests').loginAs(user)
const put = (client: ApiClient, user: User, body: unknown) =>
  client
    .put('/api/me/interests')
    .json(body as object)
    .loginAs(user)

test.group('Customer interests', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('requires a session', async ({ client }) => {
    const response = await client.get('/api/me/interests')
    response.assertStatus(401)
  })

  test('starts unanswered', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const response = await get(client, customer)
    response.assertStatus(200)
    assert.deepEqual(response.body(), { categoryIds: [] })
  })

  test('stores live ids in catalog order with answeredAt', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const saved = await put(client, customer, {
      categoryIds: ['cat_nails', 'cat_barber', 'cat_nails'],
    })
    saved.assertStatus(200)
    assert.deepEqual(saved.body().categoryIds, ['cat_barber', 'cat_nails'])
    assert.isString(saved.body().answeredAt)

    const read = await get(client, customer)
    assert.deepEqual(read.body(), saved.body())
  })

  test('accepts an empty answer as dismissed', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const response = await put(client, customer, { categoryIds: [] })
    response.assertStatus(200)
    assert.deepEqual(response.body().categoryIds, [])
    assert.isString(response.body().answeredAt)
  })

  test('replaces the previous answer', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    await put(client, customer, { categoryIds: ['cat_barber'] })
    await put(client, customer, { categoryIds: ['cat_nails'] })
    const read = await get(client, customer)
    assert.deepEqual(read.body().categoryIds, ['cat_nails'])
  })

  test('refuses {$self}')
    .with(['sub_styling', 'cat_gowns', 'nope'])
    .run(async ({ client, assert }, id) => {
      const customer = await userByEmail(customerEmail)
      const response = await put(client, customer, { categoryIds: [id] })
      response.assertStatus(422)
      assert.equal(
        (response.body() as unknown as { message: string }).message,
        'Choose from the categories on the list.'
      )
    })

  test('drops a retired category on read', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    await put(client, customer, { categoryIds: ['cat_barber', 'cat_nails'] })
    await Category.query().where('id', 'cat_nails').update({ status: 'hidden' })
    const read = await get(client, customer)
    assert.deepEqual(read.body().categoryIds, ['cat_barber'])
    assert.isString(read.body().answeredAt)
  })

  test('rejects a malformed body', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const response = await put(client, customer, { categoryIds: 'cat_barber' })
    response.assertStatus(422)
  })
})
