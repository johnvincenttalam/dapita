import Area from '#models/area'
import Category from '#models/category'
import type { Area as AreaData, ServiceCategory } from '#shared/domain'

export function toCategoryData(category: Category): ServiceCategory {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    parentId: category.parentId ?? undefined,
    icon: category.icon,
    status: category.status,
    sortOrder: category.sortOrder,
    description: category.description ?? undefined,
  }
}

export function toAreaData(area: Area): AreaData {
  return { id: area.id, slug: area.slug, name: area.name, center: area.center }
}

/** Public categories (active and coming soon), sorted for display. */
export async function listPublicCategories() {
  const categories = await Category.query().whereNot('status', 'hidden').orderBy('sortOrder', 'asc')
  return categories.map(toCategoryData)
}

export async function listAreas() {
  const areas = await Area.query().orderBy('name', 'asc')
  return areas.map(toAreaData)
}
