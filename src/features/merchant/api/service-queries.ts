import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { discoveryKeys } from '@/features/discovery/api/queries'
import { shopKeys } from '@/features/shops/api/queries'
import type { ServiceInput } from '@/schemas/service'
import { merchantServicesService, type MoveDirection, type ServiceMenu } from '@/services/merchant-services.service'

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
