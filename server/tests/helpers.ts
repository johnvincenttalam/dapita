import { rm } from 'node:fs/promises'
import { sep } from 'node:path'
import app from '@adonisjs/core/services/app'
import transmit from '@adonisjs/transmit/services/main'
import Business from '#models/business'
import Service from '#models/service'
import User from '#models/user'
import { addMinutes, bookingRules, isPreferredStartTime } from '#shared/domain'
import { uploadsRoot } from '#services/photo_storage'
import type { RealtimeEvent } from '#services/realtime'

export const customerEmail = 'customer@example.com'
export const ownerEmail = 'owner@example.com'
export const goodCutId = 'biz_good_cut'

export const userByEmail = (email: string) => User.findByOrFail('email', email)

/** The first start time the shop accepts for the service, at least `afterHours` from now. */
export async function openSlot(serviceId: string, afterHours = 3) {
  const service = await Service.findOrFail(serviceId)
  const business = await Business.findOrFail(service.businessId)
  const now = new Date()
  let start = addMinutes(now, afterHours * 60)
  start.setUTCMinutes(Math.ceil(start.getUTCMinutes() / 30) * 30, 0, 0)
  for (let i = 0; i < 14 * 48; i++, start = addMinutes(start, bookingRules.slotStepMinutes)) {
    if (
      isPreferredStartTime(business.hours, business.closures, start, service.durationMinutes, now)
    ) {
      return start.toISOString()
    }
  }
  throw new Error(`No open slot for ${serviceId}`)
}

/** Gives the business a seed-style cover photo, so its listing can be submitted. */
export async function giveCover(businessId: string) {
  const business = await Business.findOrFail(businessId)
  business.photos = [
    ...business.photos,
    {
      id: `ph_cover_${businessId}`,
      url: '/images/shops/shop-the-good-cut-barbershop-cover.webp',
      alt: business.name,
      kind: 'cover',
    },
  ]
  await business.save()
}

/**
 * Deletes the photos the tests wrote. Only inside tmp/: a shell-exported
 * `UPLOADS_DIR` overrides .env.test and could point at real photos.
 */
export async function removeTestUploads() {
  if (!uploadsRoot().startsWith(app.tmpPath() + sep)) return
  await rm(uploadsRoot(), { recursive: true, force: true })
}

/** Records every realtime broadcast until `stop()` is called. */
export function recordBroadcasts() {
  const events: { channel: string; payload: RealtimeEvent }[] = []
  const stop = transmit.on('broadcast', (event) =>
    events.push(event as { channel: string; payload: RealtimeEvent })
  )
  return { events, stop }
}
