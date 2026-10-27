import BusinessMembership from '#models/business_membership'
import type User from '#models/user'
import { noBusinessAccess } from '#exceptions/api_error'
import {
  defaultNotificationSettings,
  type ID,
  type MerchantNotificationSettings,
} from '#shared/domain'

/**
 * Each person's email choices for a business, ported from the mock in
 * src/services/merchant-settings.service.ts. No email is sent yet.
 */

async function membershipOf(user: User, businessId: ID) {
  const membership = await BusinessMembership.query().where({ userId: user.id, businessId }).first()
  if (!membership) throw noBusinessAccess()
  return membership
}

export async function getNotificationSettings(
  user: User,
  businessId: ID
): Promise<MerchantNotificationSettings> {
  const membership = await membershipOf(user, businessId)
  return { ...defaultNotificationSettings, ...membership.notificationSettings }
}

export async function updateNotificationSettings(
  user: User,
  businessId: ID,
  settings: MerchantNotificationSettings
): Promise<MerchantNotificationSettings> {
  const membership = await membershipOf(user, businessId)
  const clean: MerchantNotificationSettings = {
    newRequest: settings.newRequest,
    requestExpiring: settings.requestExpiring,
    newMessage: settings.newMessage,
    dailySummary: settings.dailySummary,
  }
  membership.notificationSettings = clean
  await membership.save()
  return clean
}
