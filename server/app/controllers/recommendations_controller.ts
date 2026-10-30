import type { HttpContext } from '@adonisjs/core/http'
import { listRecommendations } from '#services/recommendations'

/** Shop suggestions for the home and Favorites pages; guests get the popular ones. */
export default class RecommendationsController {
  async index({ auth }: HttpContext) {
    return listRecommendations(auth.user)
  }
}
