import { rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import sharp from 'sharp'
import Business from '#models/business'
import { putFile, resolveUploadPath, uploadsRoot } from '#services/photo_storage'
import { toWebpCopies } from '#services/photo_images'
import { goodCutId, removeTestUploads } from '#tests/helpers'
import { photoMessages, type ShopDetails, type ShopSummary } from '#shared/domain'

const seededCover = () =>
  app.makePath('..', 'public/images/shops/shop-the-good-cut-barbershop-cover.webp')

test.group('Uploads: stored photos and the public file route', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.teardown(removeTestUploads)

  test('serves an uploaded file with long-lived caching', async ({ client, assert }) => {
    const data = await sharp(seededCover()).resize(64).webp().toBuffer()
    await putFile('businesses/biz_x/ph_1-640.webp', data)

    const response = await client.get('/api/uploads/businesses/biz_x/ph_1-640.webp')
    response.assertStatus(200)
    response.assertHeader('cache-control', 'public, max-age=31536000, immutable')
    assert.equal(response.header('content-type'), 'image/webp')
  })

  test('never serves files outside the uploads folder', async ({ client, assert }) => {
    await putFile('businesses/biz_x/ph_1-640.webp', Buffer.from('x'))

    assert.equal(
      resolveUploadPath('businesses/biz_x/ph_1-640.webp'),
      join(uploadsRoot(), 'businesses', 'biz_x', 'ph_1-640.webp')
    )
    for (const escape of [
      '../package.json',
      `../${basename(uploadsRoot())}-evil/ph_1-640.webp`,
      'businesses/../../.env',
      '/etc/passwd',
      'C:/Windows/win.ini',
      '..\\..\\.env',
      'ph_1-640.webp\0.txt',
      '',
    ]) {
      assert.isUndefined(resolveUploadPath(escape), escape)
    }

    for (const path of [
      '/api/uploads/..%2F..%2F.env',
      '/api/uploads/../package.json',
      '/api/uploads/..%5C..%5C.env',
      '/api/uploads/%2Fetc%2Fpasswd',
      '/api/uploads/businesses/biz_x/ph_1-640.webp%00.txt',
      '/api/uploads/businesses/biz_x',
      '/api/uploads/businesses/biz_x/missing-640.webp',
    ]) {
      const response = await client.get(path)
      response.assertStatus(404)
      response.assertBody({ message: 'Not found.' })
    }
  })

  test('turns a photo into three WebP widths and rejects a renamed text file', async ({
    assert,
  }) => {
    const copies = await toWebpCopies(seededCover())
    for (const width of [320, 640, 1280] as const) {
      const metadata = await sharp(copies[width]).metadata()
      assert.equal(metadata.format, 'webp')
      assert.isAtMost(metadata.width, width)
    }

    const fake = app.tmpPath('menu.jpg')
    await writeFile(fake, 'hello')
    try {
      await assert.rejects(() => toWebpCopies(fake), photoMessages.notAPhoto)
      const error = await toWebpCopies(fake).catch((caught) => caught)
      assert.equal(error.status, 422)
    } finally {
      await rm(fake, { force: true })
    }
  })

  test('shop data shows uploaded photos as public URLs', async ({ client, assert }) => {
    const business = await Business.findOrFail(goodCutId)
    business.photos = [
      { id: 'ph_up', alt: 'a', kind: 'cover', storageKey: 'businesses/biz_good_cut/ph_up' },
    ]
    await business.save()

    const response = await client.get(`/api/shops/${business.slug}`)
    response.assertStatus(200)
    const [photo] = (response.body() as ShopDetails).photos
    assert.equal(photo.url, '/api/uploads/businesses/biz_good_cut/ph_up-1280.webp')
    assert.include(photo.srcSet, '/api/uploads/businesses/biz_good_cut/ph_up-320.webp 320w')
    assert.notProperty(photo, 'storageKey')

    const list = await client.get('/api/shops').qs({ q: business.name })
    const { items } = list.body() as { items: ShopSummary[] }
    const cover = items.find((item) => item.id === goodCutId)?.coverPhoto
    assert.equal(cover?.url, '/api/uploads/businesses/biz_good_cut/ph_up-1280.webp')
    assert.notProperty(cover, 'storageKey')
  })
})
