import { readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'
import { uploadsRoot } from '#services/photo_storage'
import {
  customerEmail,
  goodCutId,
  ownerEmail,
  removeTestUploads,
  userByEmail,
} from '#tests/helpers'
import { photoMessages, photoRules, type Service as ServiceData } from '#shared/domain'

const servicesPath = `/api/merchant/businesses/${goodCutId}/services`
const photoPath = (serviceId: string) => `${servicesPath}/${serviceId}/photo`

const fixture = () =>
  app.makePath('..', 'public/images/shops/shop-the-good-cut-barbershop-cover-640.webp')

const serviceFiles = (serviceId: string) =>
  readdir(join(uploadsRoot(), 'services', serviceId)).catch(() => [] as string[])

const publicService = async (client: ApiClient, serviceId: string) => {
  const response = await client.get('/api/shops/the-good-cut-barbershop/services')
  return (response.body() as ServiceData[]).find((s) => s.id === serviceId)!
}

const form = {
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

test.group('Merchant: service photos', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(removeTestUploads)
  group.teardown(removeTestUploads)

  test('sets a photo, replacing the seeded one, and serves WebP copies', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)
    const response = await client
      .put(photoPath('svc_mens_haircut'))
      .file('file', fixture())
      .loginAs(owner)
    response.assertStatus(200)
    const body = response.body() as ServiceData
    assert.match(body.photo!.url, /^\/api\/uploads\/services\/svc_mens_haircut\/ph_.*-1280\.webp$/)
    for (const width of photoRules.widths) assert.include(body.photo!.srcSet!, ` ${width}w`)
    assert.notInclude(JSON.stringify(body), 'storageKey')
    assert.lengthOf(await serviceFiles('svc_mens_haircut'), 3)

    const listed = await publicService(client, 'svc_mens_haircut')
    assert.deepEqual(listed.photo, body.photo)
    assert.notInclude(JSON.stringify(listed), 'storageKey')

    const menu = await client.get(servicesPath).loginAs(owner)
    menu.assertStatus(200)
    const inMenu = (menu.body() as { services: ServiceData[] }).services.find(
      (s) => s.id === 'svc_mens_haircut'
    )!
    assert.deepEqual(inMenu.photo, body.photo)
    assert.notInclude(JSON.stringify(menu.body()), 'storageKey')

    const image = await client.get(body.photo!.url)
    image.assertStatus(200)
    assert.include(image.header('content-type'), 'image/webp')
  })

  test('replacing an uploaded photo deletes the old copies', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const uploaded = await client
      .put(photoPath('svc_mens_haircut'))
      .file('file', fixture())
      .loginAs(owner)
    uploaded.assertStatus(200)
    const first = await serviceFiles('svc_mens_haircut')
    assert.lengthOf(first, 3)
    const second = await client
      .put(photoPath('svc_mens_haircut'))
      .file('file', fixture())
      .loginAs(owner)
    second.assertStatus(200)
    const after = await serviceFiles('svc_mens_haircut')
    assert.lengthOf(after, 3)
    for (const name of first) assert.notInclude(after, name)
  })

  test('removes a photo and its files, and 404s when there is none', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    await client.put(photoPath('svc_hot_shave')).file('file', fixture()).loginAs(owner)
    assert.lengthOf(await serviceFiles('svc_hot_shave'), 3)

    const removed = await client.delete(photoPath('svc_hot_shave')).loginAs(owner)
    removed.assertStatus(200)
    assert.isUndefined((removed.body() as ServiceData).photo)
    assert.lengthOf(await serviceFiles('svc_hot_shave'), 0)

    const again = await client.delete(photoPath('svc_hot_shave')).loginAs(owner)
    again.assertStatus(404)
    again.assertBodyContains({ message: photoMessages.notFound })
  })

  test('a seeded photo can be removed without touching storage', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const removed = await client.delete(photoPath('svc_mens_haircut')).loginAs(owner)
    removed.assertStatus(200)
    assert.isUndefined((removed.body() as ServiceData).photo)
    assert.lengthOf(await serviceFiles('svc_mens_haircut'), 0)
  })

  test('rejects a missing file, a renamed text file and an oversized file', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)

    const none = await client.put(photoPath('svc_mens_haircut')).loginAs(owner)
    none.assertStatus(422)
    none.assertBodyContains({ message: photoMessages.noFile })

    const fake = app.tmpPath('menu.jpg')
    await writeFile(fake, 'Haircut 150, Shave 100')
    try {
      const response = await client
        .put(photoPath('svc_mens_haircut'))
        .file('file', fake, { contentType: 'image/jpeg' })
        .loginAs(owner)
      response.assertStatus(422)
      response.assertBodyContains({ message: photoMessages.notAPhoto })
    } finally {
      await rm(fake, { force: true })
    }
    assert.lengthOf(await serviceFiles('svc_mens_haircut'), 0)

    const big = app.tmpPath('big.jpg')
    await writeFile(big, Buffer.alloc(photoRules.maxBytes + 1))
    try {
      const response = await client
        .put(photoPath('svc_mens_haircut'))
        .file('file', big)
        .loginAs(owner)
      response.assertStatus(422)
      response.assertBodyContains({ message: photoMessages.tooLarge })
    } finally {
      await rm(big, { force: true })
    }
  })

  test('only members of the business, and only its own services', async ({ client, assert }) => {
    const customer = await userByEmail(customerEmail)
    const owner = await userByEmail(ownerEmail)

    const putByCustomer = await client
      .put(photoPath('svc_mens_haircut'))
      .file('file', fixture())
      .loginAs(customer)
    putByCustomer.assertStatus(403)
    const deleteByCustomer = await client.delete(photoPath('svc_mens_haircut')).loginAs(customer)
    deleteByCustomer.assertStatus(403)

    const foreign = await client.put(photoPath('svc_gg_cut')).file('file', fixture()).loginAs(owner)
    foreign.assertStatus(404)
    foreign.assertBodyContains({ message: 'We couldn’t find that service.' })
    assert.lengthOf(await serviceFiles('svc_gg_cut'), 0)

    const missing = await client.put(photoPath('svc_nope')).file('file', fixture()).loginAs(owner)
    missing.assertStatus(404)
    assert.lengthOf(await serviceFiles('svc_nope'), 0)
  })

  test('editing the service keeps its uploaded photo', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const uploaded = await client
      .put(photoPath('svc_mens_haircut'))
      .file('file', fixture())
      .loginAs(owner)
    uploaded.assertStatus(200)

    const edited = await client
      .put(`${servicesPath}/svc_mens_haircut`)
      .json({ ...form, name: 'Gentleman’s Cut' })
      .loginAs(owner)
    edited.assertStatus(200)
    assert.deepEqual((edited.body() as ServiceData).photo, (uploaded.body() as ServiceData).photo)
  })

  test('deleting an unbooked service removes its files; a booked one keeps them', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)
    const created = await client.post(servicesPath).json(form).loginAs(owner)
    created.assertStatus(200)
    const newId = (created.body() as ServiceData).id
    await client.put(photoPath(newId)).file('file', fixture()).loginAs(owner)
    assert.lengthOf(await serviceFiles(newId), 3)
    const deleted = await client.delete(`${servicesPath}/${newId}`).loginAs(owner)
    deleted.assertStatus(204)
    assert.lengthOf(await serviceFiles(newId), 0)

    await client.put(photoPath('svc_mens_haircut')).file('file', fixture()).loginAs(owner)
    const refused = await client.delete(`${servicesPath}/svc_mens_haircut`).loginAs(owner)
    refused.assertStatus(409)
    assert.lengthOf(await serviceFiles('svc_mens_haircut'), 3)
  })
})
