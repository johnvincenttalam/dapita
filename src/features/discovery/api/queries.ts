import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import { catalogService } from '@/services/catalog.service'
import { shopsService, type ShopSearchParams } from '@/services/shops.service'

/** Query keys for discovery. The taxonomy changes rarely, so it is cached for the session. */
export const discoveryKeys = {
  all: ['discovery'] as const,
  categories: () => [...discoveryKeys.all, 'categories'] as const,
  areas: () => [...discoveryKeys.all, 'areas'] as const,
  featured: () => [...discoveryKeys.all, 'featured'] as const,
  search: (params: ShopSearchParams) => [...discoveryKeys.all, 'search', params] as const,
}

export const categoriesQueryOptions = queryOptions({
  queryKey: discoveryKeys.categories(),
  queryFn: catalogService.getCategories,
  staleTime: Infinity,
})

export const areasQueryOptions = queryOptions({
  queryKey: discoveryKeys.areas(),
  queryFn: catalogService.getAreas,
  staleTime: Infinity,
})

export function useCategoriesQuery() {
  return useQuery(categoriesQueryOptions)
}

export function useAreasQuery() {
  return useQuery(areasQueryOptions)
}

export function useFeaturedShopsQuery() {
  return useQuery({ queryKey: discoveryKeys.featured(), queryFn: shopsService.getFeaturedShops })
}

/** Keeps the previous results on screen while new filters load, so the list doesn't flash empty. */
export function useShopSearchQuery(params: ShopSearchParams) {
  return useQuery({
    queryKey: discoveryKeys.search(params),
    queryFn: () => shopsService.searchShops(params),
    placeholderData: keepPreviousData,
  })
}
