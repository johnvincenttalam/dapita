import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import { customerEmail, goodCutId, ownerEmail, userByEmail } from '#tests/helpers'
import { toDateKey, type SessionUser } from '#shared/domain'

const businessPath = `/api/merchant/businesses/${goodCutId}`

const profile = {
  name: 'The Good Cut Barbers',
  description: 'Classic cuts, fades and hot towel shaves in Poblacion since 2015.',
  categoryIds: ['cat_barber'],
  areaId: 'area_poblacion',
  address: '12 Rizal Street, Poblacion, Davao City',
  phone: '',
}

const service = {
  name: 'Buzz Cut',
  categoryId: 'sub_haircut',
  description: '',
  requirements: '',
  price: { type: 'fixed', amount: 150 },
  durationMinutes: 20,
  bufferMinutes: 0,
  featured: false,
  active: true,
}

function inDays(days: number) {
  return toDateKey(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
}

test.group('Merchant: business profile, hours, closures and policies', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('saves the profile, keeps the slug, and shows the new name in the session', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)
    const before = await client.get(businessPath).loginAs(owner)
    before.assertStatus(200)
    assert.isNotEmpty(before.body().areas)
    assert.notInclude(
      before.body().categories.map((category: { id: string }) => category.id),
      'cat_gowns'
    )

    const saved = await client.put(businessPath).json(profile).loginAs(owner)
    saved.assertStatus(200)
    assert.equal(saved.body().name, 'The Good Cut Barbers')
    assert.equal(saved.body().slug, before.body().business.slug)
    assert.notExists(saved.body().phone)

    const session = await client.get('/api/auth/session').loginAs(owner)
    const user = session.body() as SessionUser
    assert.equal(user.memberships[0].businessName, 'The Good Cut Barbers')
  })

  test('rejects invalid profiles with the form’s own messages', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)

    const short = await client
      .put(businessPath)
      .json({ ...profile, description: 'Too short' })
      .loginAs(owner)
    short.assertStatus(422)
    short.assertBodyContains({
      message: 'Describe your business in at least 20 characters',
      code: 'validation',
    })
    assert.deepEqual(short.body().details.description, [
      'Describe your business in at least 20 characters',
    ])

    const area = await client
      .put(businessPath)
      .json({ ...profile, areaId: 'area_nowhere' })
      .loginAs(owner)
    area.assertStatus(422)
    area.assertBodyContains({ message: 'Choose an area from the list.' })

    const category = await client
      .put(businessPath)
      .json({ ...profile, categoryIds: ['cat_gowns'] })
      .loginAs(owner)
    category.assertStatus(422)
    category.assertBodyContains({ message: 'Choose categories from the list.' })
  })

  test('only members can see or change a listing', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const otherOwner = await userByEmail('owner.kulot-studio@example.com')

    const asCustomer = await client.get(businessPath).loginAs(customer)
    asCustomer.assertStatus(403)
    const asOtherOwner = await client.put(businessPath).json(profile).loginAs(otherOwner)
    asOtherOwner.assertStatus(403)
    const signedOut = await client.put(`${businessPath}/policies`).json({})
    signedOut.assertStatus(401)
  })

  test('saves opening hours and refuses overlapping ones', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const hours = {
      0: [],
      1: [
        { open: '09:00', close: '12:00' },
        { open: '13:00', close: '18:00' },
      ],
      2: [{ open: '09:00', close: '18:00' }],
      3: [{ open: '09:00', close: '18:00' }],
      4: [{ open: '09:00', close: '18:00' }],
      5: [{ open: '09:00', close: '24:00' }],
      6: [{ open: '10:00', close: '16:00' }],
    }
    const saved = await client.put(`${businessPath}/hours`).json(hours).loginAs(owner)
    saved.assertStatus(200)
    assert.deepEqual(saved.body().hours, hours)

    const overlap = await client
      .put(`${businessPath}/hours`)
      .json({
        ...hours,
        1: [
          { open: '09:00', close: '14:00' },
          { open: '13:00', close: '18:00' },
        ],
      })
      .loginAs(owner)
    overlap.assertStatus(422)
    overlap.assertBodyContains({ message: 'Opening times on the same day can’t overlap' })
  })

  test('adds and removes closures, refusing ones already over', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const current = await client.get(businessPath).loginAs(owner)
    const before = current.body().business.closures

    const added = await client
      .post(`${businessPath}/closures`)
      .json({ startDate: inDays(20), endDate: inDays(21), reason: 'Team training' })
      .loginAs(owner)
    added.assertStatus(200)
    const closures = added.body().closures as { id: string; startDate: string; reason?: string }[]
    assert.lengthOf(closures, before.length + 1)
    const closure = closures.find((candidate) => candidate.reason === 'Team training')!
    assert.match(closure.id, /^cl_/)
    assert.deepEqual(
      closures.map((candidate) => candidate.startDate),
      closures.map((candidate) => candidate.startDate).toSorted()
    )

    const past = await client
      .post(`${businessPath}/closures`)
      .json({ startDate: inDays(-5), endDate: inDays(-4), reason: '' })
      .loginAs(owner)
    past.assertStatus(422)
    past.assertBodyContains({
      message: 'That closure has already passed. Choose today or a later date.',
    })

    const removed = await client.delete(`${businessPath}/closures/${closure.id}`).loginAs(owner)
    removed.assertStatus(200)
    assert.lengthOf(removed.body().closures, before.length)

    const again = await client.delete(`${businessPath}/closures/${closure.id}`).loginAs(owner)
    again.assertStatus(404)
  })

  test('a policy change starts a new version; saving the same text does not', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)
    const before = await client.get(businessPath).loginAs(owner)
    const current = before.body().business.policies

    const same = await client
      .put(`${businessPath}/policies`)
      .json({ cancellation: current.cancellation, noShow: current.noShow, deposit: '' })
      .loginAs(owner)
    same.assertStatus(200)
    assert.equal(same.body().policies.version, current.version)

    const changed = await client
      .put(`${businessPath}/policies`)
      .json({
        cancellation: 'Free cancellation up to 6 hours before your appointment.',
        noShow: '',
        deposit: '',
      })
      .loginAs(owner)
    changed.assertStatus(200)
    assert.deepEqual(changed.body().policies, {
      cancellation: 'Free cancellation up to 6 hours before your appointment.',
      version: current.version + 1,
    })
  })
})

test.group('Merchant: submitting a draft listing for review', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a new business can submit once its listing is complete', async ({ client, assert }) => {
    const signUp = await client.post('/api/auth/sign-up').json({
      accountType: 'business',
      name: 'Lea Cruz',
      email: 'lea@example.com',
      password: 'nails2026',
      businessName: 'Lea’s Nail Bar',
      consents: [
        { purpose: 'terms', version: 'draft-2026-10' },
        { purpose: 'privacy_notice', version: 'draft-2026-10' },
        { purpose: 'merchant_policy', version: 'draft-2026-10' },
      ],
    })
    signUp.assertStatus(200)
    const owner = await User.findByOrFail('email', 'lea@example.com')
    const path = `/api/merchant/businesses/${signUp.body().memberships[0].businessId}`

    const early = await client.post(`${path}/submit`).loginAs(owner)
    early.assertStatus(422)
    early.assertBodyContains({
      message: 'Finish these first: business details, services and cancellation policy.',
    })

    const details = await client
      .put(path)
      .json({
        ...profile,
        name: 'Lea’s Nail Bar',
        description: 'Gel manicures, nail art and pedicures near Bajada.',
        categoryIds: ['cat_nails'],
        areaId: 'area_bajada',
      })
      .loginAs(owner)
    details.assertStatus(200)

    const menu = await client.get(`${path}/services`).loginAs(owner)
    menu.assertStatus(200)
    const { categories } = menu.body() as { categories: { id: string }[] }
    const categoryId = categories[0].id
    const added = await client
      .post(`${path}/services`)
      .json({ ...service, name: 'Gel Manicure', categoryId })
      .loginAs(owner)
    added.assertStatus(200)

    const policies = await client
      .put(`${path}/policies`)
      .json({
        cancellation: 'Cancel or move your booking at least 2 hours ahead.',
        noShow: '',
        deposit: '',
      })
      .loginAs(owner)
    policies.assertStatus(200)

    const submitted = await client.post(`${path}/submit`).loginAs(owner)
    submitted.assertStatus(200)
    assert.equal(submitted.body().status, 'pending_review')

    const twice = await client.post(`${path}/submit`).loginAs(owner)
    twice.assertStatus(409)
    twice.assertBodyContains({ message: 'Your listing is already waiting for review.' })

    // Still private until an admin approves it.
    const shops = await client.get('/api/shops').qs({ q: 'Lea' })
    assert.notInclude(
      shops.body().items.map((shop: { name: string }) => shop.name),
      'Lea’s Nail Bar'
    )
  })

  test('a live listing cannot be submitted again', async ({ client }) => {
    const owner = await userByEmail(ownerEmail)
    const response = await client.post(`${businessPath}/submit`).loginAs(owner)
    response.assertStatus(409)
    response.assertBodyContains({ message: 'Your listing is already live.' })
  })
})

test.group('Merchant: notification settings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('start from the defaults and are kept per person', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const path = `${businessPath}/notification-settings`

    const defaults = await client.get(path).loginAs(owner)
    defaults.assertStatus(200)
    assert.deepEqual(defaults.body(), {
      newRequest: true,
      requestExpiring: true,
      newMessage: true,
      dailySummary: false,
    })

    const chosen = {
      newRequest: true,
      requestExpiring: false,
      newMessage: true,
      dailySummary: true,
    }
    const saved = await client.put(path).json(chosen).loginAs(owner)
    saved.assertStatus(200)
    assert.deepEqual(saved.body(), chosen)
    const reloaded = await client.get(path).loginAs(owner)
    assert.deepEqual(reloaded.body(), chosen)

    const invalid = await client
      .put(path)
      .json({ ...chosen, dailySummary: 'yes' })
      .loginAs(owner)
    invalid.assertStatus(422)

    const customer = await userByEmail(customerEmail)
    const asCustomer = await client.get(path).loginAs(customer)
    asCustomer.assertStatus(403)
  })
})
