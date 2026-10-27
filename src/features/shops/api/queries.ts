import { useQuery } from '@tanstack/react-query'

import { shopsService } from '@/services/shops.service'

/** Query keys for one public shop profile. */
export const shopKeys = {
  all: ['shops'] as const,
  detail: (slug: string) => [...shopKeys.all, slug] as const,
  services: (slug: string) => [...shopKeys.detail(slug), 'services'] as const,
  staff: (slug: string) => [...shopKeys.detail(slug), 'staff'] as const,
}

export function useShopQuery(slug: string) {
  return useQuery({ queryKey: shopKeys.detail(slug), queryFn: () => shopsService.getShop(slug) })
}

export function useShopServicesQuery(slug: string) {
  return useQuery({ queryKey: shopKeys.services(slug), queryFn: () => shopsService.getShopServices(slug) })
}

export function useShopStaffQuery(slug: string) {
  return useQuery({ queryKey: shopKeys.staff(slug), queryFn: () => shopsService.getShopStaff(slug) })
}
