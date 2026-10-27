import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Business from '#models/business'
import Category from '#models/category'
import type User from '#models/user'
import ApiError from '#exceptions/api_error'
import { newId } from '#helpers/ids'
import { requireStaff } from '#services/accounts'
import { toCategoryData } from '#services/catalog'
import { slugify, type AdminCategory, type CategoryStatus, type ID } from '#shared/domain'

/**
 * The category taxonomy (ADM-02), ported from the mock in src/services/admin.service.ts.
 * Administrators only. Every change answers with the whole tree, as the editor shows it.
 */

const STATUSES: CategoryStatus[] = ['active', 'hidden', 'coming_soon']

const categoryNotFound = () => new ApiError('We couldn’t find that category.', 404)

function categoryName(name: unknown) {
  const trimmed = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : ''
  if (trimmed.length < 2) {
    throw new ApiError('Give the category a name of at least 2 characters.', 422)
  }
  if (trimmed.length > 40) throw new ApiError('Keep the name to 40 characters or fewer.', 422)
  return trimmed
}

const sameName = (a: string, b: string) =>
  a.replace(/[’']/g, "'").toLowerCase() === b.replace(/[’']/g, "'").toLowerCase()

async function toCategories(client?: TransactionClientContract): Promise<AdminCategory[]> {
  const [categories, businesses, counts] = await Promise.all([
    Category.query({ client }).orderBy('sortOrder', 'asc'),
    Business.query({ client }).select('categoryIds'),
    (client ?? db)
      .from('services')
      .select('category_id')
      .count('* as total')
      .groupBy('category_id'),
  ])
  const rows = counts as { category_id: string; total: string | number }[]
  return categories.map((category) => ({
    ...toCategoryData(category),
    shopCount: businesses.filter((business) => business.categoryIds.includes(category.id)).length,
    serviceCount: Number(rows.find((row) => row.category_id === category.id)?.total ?? 0),
  }))
}

/**
 * Runs a change with the categories table locked, so two edits can't both pass the
 * name check or take the same place in the order.
 */
function change(run: (trx: TransactionClientContract) => Promise<void>) {
  return db.transaction(async (trx) => {
    await trx.rawQuery('LOCK TABLE categories IN SHARE ROW EXCLUSIVE MODE')
    await run(trx)
    return toCategories(trx)
  })
}

export function listCategories(admin: User) {
  requireStaff(admin, ['admin'])
  return toCategories()
}

export function updateCategory(admin: User, id: ID, input: { name?: unknown; status?: unknown }) {
  requireStaff(admin, ['admin'])
  const name = categoryName(input.name)
  const status = input.status as CategoryStatus
  if (!STATUSES.includes(status)) throw new ApiError('Choose a status.', 422)
  return change(async (trx) => {
    const category = await Category.find(id, { client: trx })
    if (!category) throw categoryNotFound()
    const siblings = await Category.query({ client: trx })
      .whereNot('id', id)
      .if(
        category.parentId,
        (query) => query.where('parentId', category.parentId!),
        (query) => query.whereNull('parentId')
      )
    const clash = siblings.find((other) => sameName(other.name, name))
    if (clash) throw new ApiError(`There’s already a category called “${clash.name}” here.`, 409)
    category.merge({ name, status })
    await category.save()
  })
}

/** Swaps the category with its neighbour under the same parent. */
export function moveCategory(admin: User, id: ID, direction: 'up' | 'down') {
  requireStaff(admin, ['admin'])
  return change(async (trx) => {
    const category = await Category.find(id, { client: trx })
    if (!category) throw categoryNotFound()
    const siblings = await Category.query({ client: trx })
      .if(
        category.parentId,
        (query) => query.where('parentId', category.parentId!),
        (query) => query.whereNull('parentId')
      )
      .orderBy('sortOrder', 'asc')
    const index = siblings.findIndex((other) => other.id === id)
    const current = siblings[index]
    const neighbour = siblings[direction === 'up' ? index - 1 : index + 1]
    if (!neighbour) return
    ;[current.sortOrder, neighbour.sortOrder] = [neighbour.sortOrder, current.sortOrder]
    await current.save()
    await neighbour.save()
  })
}

export function addSubcategory(admin: User, parentId: unknown, rawName: unknown) {
  requireStaff(admin, ['admin'])
  const name = categoryName(rawName)
  return change(async (trx) => {
    const parent =
      typeof parentId === 'string'
        ? await Category.query({ client: trx }).where('id', parentId).whereNull('parentId').first()
        : null
    if (!parent) throw new ApiError('Choose a top-level category.', 422)
    const all = await Category.query({ client: trx })
    const clash = all.find((other) => other.parentId === parent.id && sameName(other.name, name))
    if (clash) throw new ApiError(`${parent.name} already has “${clash.name}”.`, 409)
    let slug = slugify(name)
    for (let n = 2; all.some((other) => other.slug === slug); n++) slug = `${slugify(name)}-${n}`
    await Category.create(
      {
        id: newId('sub'),
        slug,
        name,
        parentId: parent.id,
        icon: parent.icon,
        status: 'active',
        sortOrder: Math.max(0, ...all.map((other) => other.sortOrder)) + 1,
        description: null,
      },
      { client: trx }
    )
  })
}
