import type { HttpContext } from '@adonisjs/core/http'
import { listMyFavorites, removeFavorite, saveFavorite } from '#services/favorites'

/** The customer's saved shops (CUS-07). */
export default class FavoritesController {
  async index({ auth }: HttpContext) {
    return listMyFavorites(auth.getUserOrFail())
  }

  async store({ auth, params, response }: HttpContext) {
    await saveFavorite(auth.getUserOrFail(), params.businessId)
    return response.noContent()
  }

  async destroy({ auth, params, response }: HttpContext) {
    await removeFavorite(auth.getUserOrFail(), params.businessId)
    return response.noContent()
  }
}
