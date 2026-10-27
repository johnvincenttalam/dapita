import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import {
  getFeaturedShops,
  getShop,
  getShopServices,
  getShopStaff,
  searchShops,
} from '#services/shops'

const searchValidator = vine.create({
  q: vine.string().trim().maxLength(100).optional(),
  category: vine.string().optional(),
  area: vine.string().optional(),
  priceMax: vine.number().min(0).optional(),
  openNow: vine.boolean().optional(),
  sort: vine.enum(['recommended', 'price_low', 'name'] as const).optional(),
  page: vine.number().min(1).withoutDecimals().optional(),
  pageSize: vine.number().min(1).max(50).withoutDecimals().optional(),
})

/** Public listings: no sign-in needed to browse (§2.2). */
export default class ShopsController {
  async index({ request }: HttpContext) {
    const params = await searchValidator.validate(request.qs())
    return searchShops(params)
  }

  async featured() {
    return getFeaturedShops()
  }

  async show({ params }: HttpContext) {
    return getShop(params.slug)
  }

  async services({ params }: HttpContext) {
    return getShopServices(params.slug)
  }

  async staff({ params }: HttpContext) {
    return getShopStaff(params.slug)
  }
}
