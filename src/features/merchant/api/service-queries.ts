import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { discoveryKeys } from '@/features/discovery/api/queries'
import { shopKeys } from '@/features/shops/api/queries'
import type { ServiceInput } from '@/schemas/service'
import { merchantServicesService, type MoveDirection, type ServiceMenu } from '@/services/merchant-services.service'
import type { Service } from '@/types/business'

export const merchantServiceKeys = {
  all: ['merchant-services'] as const,
  menu: (businessId: string) => [...merchantServiceKeys.all, businessId] as const,
}

export function useServiceMenuQuery(businessId: string | undefined) {
  return useQuery({
    queryKey: merchantServiceKeys.menu(businessId ?? ''),
    queryFn: () => merchantServicesService.getServiceMenu(businessId ?? ''),
    enabled: Boolean(businessId),
  })
}

/** The menu changed: re-read it, and the public shop pages and search results that show it. */
function invalidateMenu(queryClient: QueryClient, businessId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: merchantServiceKeys.menu(businessId) }),
    queryClient.invalidateQueries({ queryKey: shopKeys.all }),
    queryClient.invalidateQueries({ queryKey: discoveryKeys.all }),
  ])
}

/** Swaps the returned service into the cached menu, so the new photo shows before the refetch lands. */
function replaceMenuService(queryClient: QueryClient, businessId: string, service: Service) {
  queryClient.setQueryData<ServiceMenu>(merchantServiceKeys.menu(businessId), (menu) =>
    menu
      ? { ...menu, services: menu.services.map((existing) => (existing.id === service.id ? service : existing)) }
      : menu,
  )
  return invalidateMenu(queryClient, businessId)
}

/** Creates a service, or updates it when `serviceId` is given. A form that shows its own error turns the toast off. */
export function useSaveServiceMutation(businessId: string, { showErrorToast = true } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast },
    mutationFn: ({ serviceId, input }: { serviceId?: string; input: ServiceInput }) =>
      serviceId
        ? merchantServicesService.updateService(businessId, serviceId, input)
        : merchantServicesService.createService(businessId, input),
    onSuccess: () => invalidateMenu(queryClient, businessId),
  })
}

export function useMoveServiceMutation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, direction }: { serviceId: string; direction: MoveDirection }) =>
      merchantServicesService.moveService(businessId, serviceId, direction),
    onSuccess: (services) => {
      queryClient.setQueryData<ServiceMenu>(merchantServiceKeys.menu(businessId), (menu) =>
        menu ? { ...menu, services } : menu,
      )
      return invalidateMenu(queryClient, businessId)
    },
  })
}

export function useDeleteServiceMutation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (serviceId: string) => merchantServicesService.deleteService(businessId, serviceId),
    onSuccess: () => invalidateMenu(queryClient, businessId),
  })
}

/** Uploads straight away. No error toast: the photo field shows its own error. */
export function useSetServicePhotoMutation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ serviceId, file }: { serviceId: string; file: File }) =>
      merchantServicesService.setServicePhoto(businessId, serviceId, file),
    onSuccess: (service) => replaceMenuService(queryClient, businessId, service),
  })
}

export function useRemoveServicePhotoMutation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: true },
    mutationFn: (serviceId: string) => merchantServicesService.removeServicePhoto(businessId, serviceId),
    onSuccess: (service) => replaceMenuService(queryClient, businessId, service),
  })
}
