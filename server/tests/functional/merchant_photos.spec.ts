import { existsSync } from 'node:fs'
import { readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import Business from '#models/business'
import { uploadsRoot } from '#services/photo_storage'
import {
  customerEmail,
  goodCutId,
  ownerEmail,
  removeTestUploads,
  userByEmail,
} from '#tests/helpers'
import { photoMessages, type Business as BusinessData, type BusinessPhoto } from '#shared/domain'

const photosPath = `/api/merchant/businesses/${goodCutId}/photos`

const fixture = () =>
  app.makePath('..', 'public/images/shops/shop-the-good-cut-barbershop-cover-640.webp')

/** The file an uploaded photo's URL points at, e.g. its `-1280.webp` copy. */
const uploadedFile = (photo: BusinessPhoto) =>
  join(uploadsRoot(), photo.url.replace('/api/uploads/', ''))

const shopFiles = () =>
  readdir(join(uploadsRoot(), 'businesses', goodCutId)).catch(() => [] as string[])

const cover = (business: BusinessData) => business.photos.find((photo) => photo.kind === 'cover')!
const gallery = (business: BusinessData) =>
  business.photos.filter((photo) => photo.kind === 'gallery')

async function storedPhotos() {
  const business = await Business.findOrFail(goodCutId)
  return business.photos
}

test.group('Merchant: cover and gallery photos', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.teardown(removeTestUploads)

  test('replaces a seeded cover with an upload', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const row = await Business.findOrFail(goodCutId)
    const seeded = row.coverPhoto!

    const response = await client.put(`${photosPath}/cover`).file('file', fixture()).loginAs(owner)
    response.assertStatus(200)
    const business = response.body() as BusinessData
    assert.match(cover(business).url, /^\/api\/uploads\/businesses\/biz_good_cut\//)
    assert.equal(cover(business).alt, 'The Good Cut Barbershop')
    assert.equal(business.photos[0].kind, 'cover')
    assert.lengthOf(business.photos, 1)
    assert.isTrue(existsSync(uploadedFile(cover(business))))
    assert.isTrue(existsSync(app.makePath('..', 'public', seeded.url)))
  })

  test('replacing an uploaded cover deletes the old files', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const first = await client.put(`${photosPath}/cover`).file('file', fixture()).loginAs(owner)
    const firstCover = cover(first.body())

    const second = await client.put(`${photosPath}/cover`).file('file', fixture()).loginAs(owner)
    second.assertStatus(200)
    assert.notEqual(cover(second.body()).id, firstCover.id)
    assert.lengthOf(second.body().photos, 1)
    assert.isFalse(existsSync(uploadedFile(firstCover)))
    assert.isTrue(existsSync(uploadedFile(cover(second.body()))))
  })

  test('adds gallery photos up to 8, then refuses', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    let business: BusinessData | undefined
    for (let i = 0; i < 8; i++) {
      const response = await client.post(photosPath).file('file', fixture()).loginAs(owner)
      response.assertStatus(200)
      business = response.body()
    }
    assert.lengthOf(gallery(business!), 8)
    assert.equal(gallery(business!)[0].alt, 'The Good Cut Barbershop, photo 1')
    assert.equal(gallery(business!)[7].alt, 'The Good Cut Barbershop, photo 8')
    assert.equal(business!.photos[0].kind, 'cover')

    const files = await shopFiles()
    const ninth = await client.post(photosPath).file('file', fixture()).loginAs(owner)
    ninth.assertStatus(422)
    ninth.assertBodyContains({ message: photoMessages.galleryFull })
    assert.sameMembers(await shopFiles(), files)
  })

  test('rejects a text file named like a photo and stores nothing', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    const before = await storedPhotos()
    const files = await shopFiles()
    const fake = app.tmpPath('menu.jpg')
    await writeFile(fake, 'Haircut 150, Shave 100')
    try {
      const response = await client
        .post(photosPath)
        .file('file', fake, { contentType: 'image/jpeg' })
        .loginAs(owner)
      response.assertStatus(422)
      response.assertBodyContains({ message: photoMessages.notAPhoto })
    } finally {
      await rm(fake, { force: true })
    }
    assert.sameMembers(await shopFiles(), files)
    assert.deepEqual(await storedPhotos(), before)
  })

  test('rejects a file over 10 MB', async ({ client }) => {
    const owner = await userByEmail(ownerEmail)
    const big = app.tmpPath('big.jpg')
    await writeFile(big, Buffer.alloc(11 * 1024 * 1024))
    try {
      const response = await client.post(photosPath).file('file', big).loginAs(owner)
      response.assertStatus(422)
      response.assertBodyContains({ message: photoMessages.tooLarge })
    } finally {
      await rm(big, { force: true })
    }
  })

  test('asks for a file when none is sent', async ({ client }) => {
    const owner = await userByEmail(ownerEmail)
    const response = await client.put(`${photosPath}/cover`).loginAs(owner)
    response.assertStatus(422)
    response.assertBodyContains({ message: photoMessages.noFile })
  })

  test('won’t remove the cover; removes a gallery photo and its files', async ({
    client,
    assert,
  }) => {
    const owner = await userByEmail(ownerEmail)
    const added = await client.post(photosPath).file('file', fixture()).loginAs(owner)
    const business = added.body() as BusinessData
    const [photo] = gallery(business)

    const coverDelete = await client.delete(`${photosPath}/${cover(business).id}`).loginAs(owner)
    coverDelete.assertStatus(422)
    coverDelete.assertBodyContains({ message: photoMessages.cantRemoveCover })

    const removed = await client.delete(`${photosPath}/${photo.id}`).loginAs(owner)
    removed.assertStatus(200)
    assert.lengthOf(gallery(removed.body()), 0)
    assert.equal(cover(removed.body()).id, cover(business).id)
    assert.isFalse(existsSync(uploadedFile(photo)))

    const unknown = await client.delete(`${photosPath}/ph_missing`).loginAs(owner)
    unknown.assertStatus(404)
    unknown.assertBodyContains({ message: photoMessages.notFound })
  })

  test('reorders the gallery and refuses a stale order', async ({ client, assert }) => {
    const owner = await userByEmail(ownerEmail)
    let business: BusinessData | undefined
    for (let i = 0; i < 3; i++) {
      const uploaded = await client.post(photosPath).file('file', fixture()).loginAs(owner)
      business = uploaded.body()
    }
    const ids = gallery(business!).map((photo) => photo.id)
    const reversed = [...ids].reverse()

    const response = await client.put(`${photosPath}/order`).json({ ids: reversed }).loginAs(owner)
    response.assertStatus(200)
    const reordered = response.body() as BusinessData
    assert.equal(reordered.photos[0].id, cover(business!).id)
    assert.deepEqual(
      gallery(reordered).map((photo) => photo.id),
      reversed
    )

    for (const stale of [ids.slice(1), [...ids, 'ph_missing'], [ids[0], ids[0], ids[1]], 'x']) {
      const refused = await client.put(`${photosPath}/order`).json({ ids: stale }).loginAs(owner)
      refused.assertStatus(422)
      refused.assertBodyContains({ message: photoMessages.staleOrder })
    }
    const after = await Business.findOrFail(goodCutId)
    assert.deepEqual(
      after.photos.map((photo) => photo.id),
      reordered.photos.map((photo) => photo.id)
    )
  })

  test('only members can manage photos', async ({ client }) => {
    const customer = await userByEmail(customerEmail)
    const business = await Business.findOrFail(goodCutId)
    const responses = [
      await client.put(`${photosPath}/cover`).file('file', fixture()).loginAs(customer),
      await client.post(photosPath).file('file', fixture()).loginAs(customer),
      await client.delete(`${photosPath}/${business.photos[0].id}`).loginAs(customer),
      await client.put(`${photosPath}/order`).json({ ids: [] }).loginAs(customer),
    ]
    for (const response of responses) response.assertStatus(403)
  })
})

/**
 * Outside the global transaction, so each request takes the real row lock. The
 * listing's photos are put back afterwards.
 */
test.group('Merchant: concurrent photo uploads', (group) => {
  group.teardown(removeTestUploads)

  test('keeps both photos when two uploads land at once', async ({ client, assert, cleanup }) => {
    const owner = await userByEmail(ownerEmail)
    const { photos, updatedAt } = await Business.findOrFail(goodCutId)
    cleanup(async () => {
      const business = await Business.findOrFail(goodCutId)
      business.merge({ photos, updatedAt })
      await business.save()
    })

    const responses = await Promise.all([
      client.post(photosPath).file('file', fixture()).loginAs(owner),
      client.post(photosPath).file('file', fixture()).loginAs(owner),
    ])
    for (const response of responses) response.assertStatus(200)
    const saved = await Business.findOrFail(goodCutId)
    assert.lengthOf(
      saved.photos.filter((photo) => photo.kind === 'gallery'),
      photos.filter((photo) => photo.kind === 'gallery').length + 2
    )
  })
})
