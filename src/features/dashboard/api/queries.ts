import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { dashboardService } from '@/services/dashboard.service'

/** Query keys for this feature. Invalidate `dashboardKeys.all` to refresh everything. */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardKeys.all, 'metrics'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
  customers: () => [...dashboardKeys.all, 'customers'] as const,
}

export function useMetricsQuery() {
  return useQuery({ queryKey: dashboardKeys.metrics(), queryFn: dashboardService.getMetrics })
}

export function useRecentActivityQuery() {
  return useQuery({ queryKey: dashboardKeys.activity(), queryFn: dashboardService.getRecentActivity })
}

export function useCustomersQuery() {
  return useQuery({ queryKey: dashboardKeys.customers(), queryFn: dashboardService.getCustomers })
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dashboardService.deleteCustomer,
    meta: { successMessage: 'Customer deleted (mock data only)' },
    onSettled: () => queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  })
}
