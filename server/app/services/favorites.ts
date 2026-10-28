import db from '@adonisjs/lucid/services/db'
import Business from '#models/business'
import Favorite from '#models/favorite'
import type User from '#models/user'
import ApiError from '#exceptions/api_error'
import { isMember, requireRole } from '#services/accounts'
import { getShopSummaries } from '#services/shops'
import type { ID } from '#shared/domain'

/**
 * Saved shops (CUS-07), ported from the mock in src/services/favorites.service.ts.
 * A shop that leaves the marketplace drops out of the list but stays saved, so it
 * comes back if the listing does.
 */

function requireCustomer(user: User) {
  requireRole(user, ['customer'], 'Only customer accounts can save shops.')
}

export async function listMyFavorites(user: User) {
  requireCustomer(user)
  const favorites = await Favorite.query().where('userId', user.id).orderBy('savedAt', 'desc')
  return getShopSummaries(favorites.map((favorite) => favorite.businessId))
}

export async function saveFavorite(user: User, businessId: ID) {
  requireCustomer(user)
  const business = await Business.query().where({ id: businessId, status: 'approved' }).first()
  if (!business) throw new ApiError('This shop isn’t available any more.', 404)
  if (await isMember(user, businessId)) throw new ApiError('You can’t save your own business.', 422)
  // Saving twice (a double tap, two tabs) keeps the first save.
  await db
    .table('favorites')
    .insert({ user_id: user.id, business_id: businessId, saved_at: new Date() })
    .onConflict(['user_id', 'business_id'])
    .ignore()
}

export async function removeFavorite(user: User, businessId: ID) {
  requireCustomer(user)
  await Favorite.query().where({ userId: user.id, businessId }).delete()
}
