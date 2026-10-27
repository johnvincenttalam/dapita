import type { ShopSearchParams, ShopSort } from '@/services/shops.service'

// The Explore page keeps every filter in the URL so results can be shared,
// bookmarked and restored with the back button.

const sorts: readonly ShopSort[] = ['recommended', 'price_low', 'name']

/** Price ceilings offered in the filter. Amounts are whole pesos. */
export const priceOptions = [300, 500, 1000, 2000] as const

function positiveInt(value: string | null) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : undefined
}

export function parseExploreParams(search: URLSearchParams): ShopSearchParams {
  const sort = search.get('sort') as ShopSort | null
  return {
    q: search.get('q')?.trim() || undefined,
    category: search.get('category') || undefined,
    area: search.get('area') || undefined,
    priceMax: positiveInt(search.get('price')),
    openNow: search.get('open') === '1' || undefined,
    sort: sort && sorts.includes(sort) ? sort : undefined,
    page: positiveInt(search.get('page')),
  }
}

/** Applies `changes` to the current URL params. Any filter change returns to page 1. */
export function updateExploreParams(search: URLSearchParams, changes: Partial<ShopSearchParams>) {
  const next = new URLSearchParams(search)
  const set = (key: string, value: string | undefined) => (value ? next.set(key, value) : next.delete(key))
  if ('q' in changes) set('q', changes.q)
  if ('category' in changes) set('category', changes.category)
  if ('area' in changes) set('area', changes.area)
  if ('priceMax' in changes) set('price', changes.priceMax?.toString())
  if ('openNow' in changes) set('open', changes.openNow ? '1' : undefined)
  if ('sort' in changes) set('sort', changes.sort === 'recommended' ? undefined : changes.sort)
  if ('page' in changes) set('page', changes.page && changes.page > 1 ? String(changes.page) : undefined)
  else next.delete('page')
  return next
}

/** Filters other than the keyword and category, which have their own controls. */
export function countRefinements(params: ShopSearchParams) {
  return [params.area, params.priceMax, params.openNow].filter(Boolean).length
}
