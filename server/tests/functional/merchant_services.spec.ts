import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import StaffMember from '#models/staff_member'
import { customerEmail, goodCutId, ownerEmail, userByEmail } from '#tests/helpers'
import type { SessionUser } from '#shared/domain'

const servicesPath = `/api/merchant/businesses/${goodCutId}/services`

const service = {
  name: 'Buzz Cut',
  categoryId: 'sub_haircut',
  description: 'One length all over.',
  requirements: '',
  price: { type: 'fixed', amount: 150 },
  durationMinutes: 20,
  bufferMinutes: 0,
  featured: false,
  active: true,
}

type MenuItem = { id: string; name: string; categoryId: string; sortOrder: number }

const idsIn = (menu: MenuItem[], categoryId: string) =>
  menu.filter((item) => item.categoryId === categoryId).map((item) => item.id)

test.group('Merchant: service menu', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists the whole menu with the categories a service can go under', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)
    const response = await client.get(servicesPath).loginAs(owner)
    response.assertStatus(200)
    const menu = response.body()
    assert.equal(menu.shopSlug, 'the-good-cut-barbershop')
    assert.lengthOf(menu.services, 6)
    assert.deepEqual(
      menu.categories.map((category: { id: string }) => category.id),
      ['sub_haircut', 'sub_beard']
    )
  })

  test('adds a service at the end of the menu and edits it', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)

    const created = await client.post(servicesPath).json(service).loginAs(owner)
    created.assertStatus(200)
    const buzz = created.body()
    assert.match(buzz.id, /^svc_/)
    assert.equal(buzz.businessId, goodCutId)
    assert.equal(buzz.sortOrder, 7)
    assert.notExists(buzz.requirements)

    const updated = await client
      .put(`${servicesPath}/${buzz.id}`)
      .json({ ...service, description: '', price: { type: 'from', amount: 180 }, active: false })
      .loginAs(owner)
    updated.assertStatus(200)
    assert.deepEqual(updated.body().price, { type: 'from', amount: 180 })
    assert.isFalse(updated.body().active)
    assert.notExists(updated.body().description)

    // Hidden services stay off the public shop page.
    const shop = await client.get('/api/shops/the-good-cut-barbershop/services')
    assert.notInclude(
      shop.body().map((item: { id: string }) => item.id),
      buzz.id
    )
  })

  test('refuses duplicate names, foreign categories and invalid input', async ({ client }) => {
    const owner = await userByEmail(ownerEmail)

    const duplicate = await client
      .post(servicesPath)
      .json({ ...service, name: "  men's   HAIRCUT " })
      .loginAs(owner)
    duplicate.assertStatus(409)
    duplicate.assertBodyContains({ message: 'You already have a service called “Men’s Haircut”.' })

    const renamed = await client
      .put(`${servicesPath}/svc_hair_beard`)
      .json({ ...service, name: 'Hot Towel Shave', categoryId: 'sub_beard' })
      .loginAs(owner)
    renamed.assertStatus(409)

    const foreign = await client
      .post(servicesPath)
      .json({ ...service, categoryId: 'cat_spa' })
      .loginAs(owner)
    foreign.assertStatus(422)
    foreign.assertBodyContains({ message: 'Choose one of your business’s categories.' })

    const invalid = await client
      .post(servicesPath)
      .json({ ...service, durationMinutes: 22 })
      .loginAs(owner)
    invalid.assertStatus(422)
    invalid.assertBodyContains({
      message: 'Use 5-minute steps',
      details: { durationMinutes: ['Use 5-minute steps'] },
    })
  })

  test('moves a service within its category only', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const initial = await client.get(servicesPath).loginAs(owner)
    const before = initial.body().services as MenuItem[]
    assert.deepEqual(idsIn(before, 'sub_haircut'), [
      'svc_mens_haircut',
      'svc_cut_styling',
      'svc_kids_cut',
      'svc_mens_color',
    ])

    const moved = await client
      .post(`${servicesPath}/svc_cut_styling/move`)
      .json({ direction: 'up' })
      .loginAs(owner)
    moved.assertStatus(200)
    const after = moved.body() as MenuItem[]
    assert.deepEqual(idsIn(after, 'sub_haircut'), [
      'svc_cut_styling',
      'svc_mens_haircut',
      'svc_kids_cut',
      'svc_mens_color',
    ])
    assert.deepEqual(idsIn(after, 'sub_beard'), idsIn(before, 'sub_beard'))

    // Already first in its category: nothing changes.
    const top = await client
      .post(`${servicesPath}/svc_cut_styling/move`)
      .json({ direction: 'up' })
      .loginAs(owner)
    assert.deepEqual(idsIn(top.body(), 'sub_haircut'), idsIn(after, 'sub_haircut'))

    const sideways = await client
      .post(`${servicesPath}/svc_cut_styling/move`)
      .json({ direction: 'left' })
      .loginAs(owner)
    sideways.assertStatus(422)
  })

  test('deletes a service nobody booked and takes it off staff; booked ones stay', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)

    const booked = await client.delete(`${servicesPath}/svc_mens_haircut`).loginAs(owner)
    booked.assertStatus(409)
    booked.assertBodyContains({
      message: 'Customers have booked this service, so it can’t be deleted. Hide it instead.',
    })

    const deleted = await client.delete(`${servicesPath}/svc_hot_shave`).loginAs(owner)
    deleted.assertStatus(204)
    const after = await client.get(servicesPath).loginAs(owner)
    const menu = after.body().services as MenuItem[]
    assert.notInclude(
      menu.map((item) => item.id),
      'svc_hot_shave'
    )
    const ken = await StaffMember.findOrFail('stf_ken')
    assert.notInclude(ken.serviceIds, 'svc_hot_shave')

    const gone = await client.delete(`${servicesPath}/svc_hot_shave`).loginAs(owner)
    gone.assertStatus(404)
  })

  test('only members can manage the menu, and only their own services', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const otherOwner = await userByEmail('owner.kulot-studio@example.com')

    const asCustomer = await client.get(servicesPath).loginAs(customer)
    asCustomer.assertStatus(403)
    const asOtherOwner = await client.post(servicesPath).json(service).loginAs(otherOwner)
    asOtherOwner.assertStatus(403)
    const signedOut = await client.delete(`${servicesPath}/svc_mens_color`)
    signedOut.assertStatus(401)

    // A Good Cut service id under another business's path is not found there.
    const session = await client.get('/api/auth/session').loginAs(otherOwner)
    const { businessId } = (session.body() as SessionUser).memberships[0]
    const elsewhere = await client
      .put(`/api/merchant/businesses/${businessId}/services/svc_mens_color`)
      .json(service)
      .loginAs(otherOwner)
    elsewhere.assertStatus(404)
  })
})
