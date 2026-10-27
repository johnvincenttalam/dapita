import type { HttpContext } from '@adonisjs/core/http'
import { formBody } from '#helpers/validate'
import { addCaseNote, getCase, listCases, resolveCase, takeCase } from '#services/admin_cases'
import {
  addSubcategory,
  listCategories,
  moveCategory,
  updateCategory,
} from '#services/admin_categories'
import {
  getMerchantReview,
  listMerchants,
  moderateMerchant,
  setFeatured,
} from '#services/admin_merchants'
import { listUsers, reinstateUser, suspendUser } from '#services/admin_users'
import { directionValidator, featuredValidator, userSearchValidator } from '#validators/admin'

/**
 * The admin console (ADM-01–03). Each service checks the staff role it needs:
 * administrators for listings, categories and suspensions; support staff too for
 * cases and account lookup.
 */
export default class AdminController {
  // Listings
  async merchants({ auth }: HttpContext) {
    return listMerchants(auth.getUserOrFail())
  }

  async merchant({ auth, params }: HttpContext) {
    return getMerchantReview(auth.getUserOrFail(), params.id)
  }

  async moderate({ auth, params, request }: HttpContext) {
    return moderateMerchant(auth.getUserOrFail(), params.id, formBody(request))
  }

  async featured({ auth, params, request }: HttpContext) {
    const { featured } = await request.validateUsing(featuredValidator)
    return setFeatured(auth.getUserOrFail(), params.id, featured)
  }

  // Support cases
  async cases({ auth }: HttpContext) {
    return listCases(auth.getUserOrFail())
  }

  async case({ auth, params }: HttpContext) {
    return getCase(auth.getUserOrFail(), params.id)
  }

  async takeCase({ auth, params }: HttpContext) {
    return takeCase(auth.getUserOrFail(), params.id)
  }

  async addNote({ auth, params, request }: HttpContext) {
    return addCaseNote(auth.getUserOrFail(), params.id, request.input('text'))
  }

  async resolve({ auth, params, request }: HttpContext) {
    return resolveCase(auth.getUserOrFail(), params.id, request.input('resolution'))
  }

  // Categories
  async categories({ auth }: HttpContext) {
    return listCategories(auth.getUserOrFail())
  }

  async addCategory({ auth, request }: HttpContext) {
    return addSubcategory(auth.getUserOrFail(), request.input('parentId'), request.input('name'))
  }

  async updateCategory({ auth, params, request }: HttpContext) {
    return updateCategory(auth.getUserOrFail(), params.id, request.only(['name', 'status']))
  }

  async moveCategory({ auth, params, request }: HttpContext) {
    const { direction } = await request.validateUsing(directionValidator)
    return moveCategory(auth.getUserOrFail(), params.id, direction)
  }

  // Accounts
  async users({ auth, request }: HttpContext) {
    const { q } = await userSearchValidator.validate(request.qs())
    return listUsers(auth.getUserOrFail(), q)
  }

  async suspend({ auth, params, request }: HttpContext) {
    return suspendUser(auth.getUserOrFail(), params.id, request.input('reason'))
  }

  async reinstate({ auth, params, request }: HttpContext) {
    return reinstateUser(auth.getUserOrFail(), params.id, request.input('reason'))
  }
}
