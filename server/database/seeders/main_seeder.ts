import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Area from '#models/area'
import Booking from '#models/booking'
import BookingEvent from '#models/booking_event'
import Business from '#models/business'
import BusinessMembership from '#models/business_membership'
import Category from '#models/category'
import Consent from '#models/consent'
import Favorite from '#models/favorite'
import Conversation from '#models/conversation'
import Message from '#models/message'
import Service from '#models/service'
import StaffMember from '#models/staff_member'
import User from '#models/user'
import type * as Domain from '#shared/domain'

/** What scripts/export-mock-seed.mjs writes: the frontend's mock-mode demo data. */
interface SeedData {
  password: string
  users: Domain.SessionUser[]
  legalVersions: Record<Domain.ConsentPurpose, string>
  areas: Domain.Area[]
  categories: Domain.ServiceCategory[]
  businesses: Domain.Business[]
  services: Domain.Service[]
  staff: Domain.StaffMember[]
  bookings: Domain.Booking[]
  bookingEvents: Domain.BookingEvent[]
  conversations: Domain.Conversation[]
  messages: Domain.Message[]
  favorites: Domain.Favorite[]
}

export const SEED_FILE = 'seed.json'

/**
 * Loads the same demo accounts, shops, bookings and conversations the mock mode
 * shows, so both modes tell the same story. Run `npm run db:reset`, which exports
 * fresh data first (seed dates are relative to today).
 */
export default class MainSeeder extends BaseSeeder {
  async run() {
    const file = app.tmpPath(SEED_FILE)
    if (!existsSync(file)) {
      throw new Error(`Missing ${file}. Run "npm run db:reset", which exports the demo data first.`)
    }
    const seed = JSON.parse(await readFile(file, 'utf8')) as SeedData
    const accountCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // The mock only has a login for The Good Cut's owner. Every other listing gets an
    // owner account too (owner.<slug>@example.com), so any shop can be tested from its side.
    const users: Domain.SessionUser[] = [...seed.users]
    for (const business of seed.businesses) {
      if (users.some((user) => user.id === business.ownerId)) continue
      users.push({
        id: business.ownerId,
        name: `${business.name} owner`,
        email: `owner.${business.slug}@example.com`,
        roles: ['customer', 'merchant_owner'],
        memberships: [{ businessId: business.id, businessName: business.name, role: 'owner' }],
        emailVerified: true,
      })
    }
    // Likewise for the other customers in the demo bookings and conversations.
    const customers = [
      ...seed.bookings.map((booking) => ({ id: booking.customerId, ...booking.contact })),
      ...seed.conversations.map((conversation) => ({
        id: conversation.customerId,
        name: conversation.customerName,
        email: `customer.${conversation.customerId}@example.com`,
      })),
    ]
    for (const customer of customers) {
      if (users.some((user) => user.id === customer.id || user.email === customer.email)) continue
      users.push({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        roles: ['customer'],
        memberships: [],
        emailVerified: true,
      })
    }

    await User.createMany(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        password: seed.password,
        phone: null,
        roles: [...user.roles],
        emailVerifiedAt: user.emailVerified ? accountCreatedAt : null,
        suspendedAt: null,
        createdAt: accountCreatedAt,
        updatedAt: accountCreatedAt,
      }))
    )
    await BusinessMembership.createMany(
      users.flatMap((user) =>
        user.memberships.map((membership) => ({
          userId: user.id,
          businessId: membership.businessId,
          role: membership.role,
        }))
      )
    )
    await Consent.createMany(
      users.flatMap((user) => {
        const purposes: Domain.ConsentPurpose[] = user.roles.includes('merchant_owner')
          ? ['terms', 'privacy_notice', 'merchant_policy']
          : ['terms', 'privacy_notice']
        return purposes.map((purpose) => ({
          id: `cns_${user.id}_${purpose}`,
          userId: user.id,
          purpose,
          version: seed.legalVersions[purpose],
          grantedAt: accountCreatedAt,
        }))
      })
    )

    await Area.createMany(seed.areas)
    await Category.createMany(
      seed.categories.map((category) => ({
        ...category,
        parentId: category.parentId ?? null,
        description: category.description ?? null,
      }))
    )

    await Business.createMany(
      seed.businesses.map((business) => ({
        ...business,
        coordinates: business.coordinates ?? null,
        phone: business.phone ?? null,
        rating: business.rating ?? null,
        moderationNote: business.moderationNote ?? null,
      }))
    )
    await Service.createMany(
      seed.services.map((service) => ({
        ...service,
        description: service.description ?? null,
        requirements: service.requirements ?? null,
        photoUrl: service.photoUrl ?? null,
      }))
    )
    await StaffMember.createMany(
      seed.staff.map((member) => ({
        ...member,
        title: member.title ?? null,
        avatarUrl: member.avatarUrl ?? null,
      }))
    )

    await Booking.createMany(
      seed.bookings.map((booking) => ({
        ...booking,
        proposal: booking.proposal ?? null,
        notes: booking.notes ?? null,
        respondBy: booking.respondBy ?? null,
        idempotencyKey: null,
      }))
    )
    await BookingEvent.createMany(
      seed.bookingEvents.map((event) => ({ ...event, reason: event.reason ?? null }))
    )

    await Conversation.createMany(
      seed.conversations.map((conversation) => ({
        ...conversation,
        bookingId: conversation.bookingId ?? null,
        reportedAt: conversation.reportedAt ?? null,
      }))
    )
    await Message.createMany(
      seed.messages.map((message) => ({ ...message, readAt: message.readAt ?? null }))
    )
    await Favorite.createMany(seed.favorites)
  }
}
