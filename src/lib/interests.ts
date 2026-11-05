import type { CustomerInterests } from '@/types/account'
import type { ServiceCategory } from '@/types/catalog'
import type { ID } from '@/types/common'

export const interestsMessages = { notOnList: 'Choose from the categories on the list.' } as const

/** Top-level, active, by sortOrder. */
export function liveInterestCategories(categories: readonly ServiceCategory[]): ServiceCategory[] {
  return categories
    .filter((category) => !category.parentId && category.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** Deduped and in catalog order; null when any id isn't a live top-level category. */
export function normaliseInterestIds(ids: readonly ID[], categories: readonly ServiceCategory[]): ID[] | null {
  const live = liveInterestCategories(categories)
  const liveIds = new Set(live.map((category) => category.id))
  if (ids.some((id) => !liveIds.has(id))) return null
  const wanted = new Set(ids)
  return live.filter((category) => wanted.has(category.id)).map((category) => category.id)
}

/** Drops ids that are no longer live, keeps answeredAt. */
export function dropRetiredInterests(
  interests: CustomerInterests,
  categories: readonly ServiceCategory[],
): CustomerInterests {
  const liveIds = new Set(liveInterestCategories(categories).map((category) => category.id))
  const kept = interests.categoryIds.filter((id) => liveIds.has(id))
  return kept.length === interests.categoryIds.length ? interests : { ...interests, categoryIds: kept }
}

/** Stable partition: items with any picked category first, each group in its input order. */
export function preferredFirst<T>(
  items: readonly T[],
  interests: ReadonlySet<ID>,
  categoryIdsOf: (item: T) => readonly ID[],
): T[] {
  const preferred: T[] = []
  const rest: T[] = []
  for (const item of items) {
    if (categoryIdsOf(item).some((id) => interests.has(id))) preferred.push(item)
    else rest.push(item)
  }
  return [...preferred, ...rest]
}

/** 'Barber first' | 'Salon and Nails first' | 'Salon, Spa & Massage and Nails first' | 'Showing everything' */
export function interestsSummary(names: readonly string[]): string {
  if (names.length === 0) return 'Showing everything'
  const last = names[names.length - 1]
  const list = names.length === 1 ? last : `${names.slice(0, -1).join(', ')} and ${last}`
  return `${list} first`
}

/** '/explore?category=<slug>' when exactly one live pick, else '/explore'. */
export function exploreHrefFor(categoryIds: readonly ID[], categories: readonly ServiceCategory[]): string {
  const picked = liveInterestCategories(categories).filter((category) => categoryIds.includes(category.id))
  const [only] = picked
  return only && picked.length === 1 ? `/explore?category=${only.slug}` : '/explore'
}
