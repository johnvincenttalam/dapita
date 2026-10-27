import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { merchantSettingsService } from '@/services/merchant-settings.service'
import type { MerchantNotificationSettings } from '@/types/settings'

export const merchantSettingsKeys = {
  notifications: (businessId: string) => ['merchant-settings', businessId, 'notifications'] as const,
}

export function useNotificationSettingsQuery(businessId: string | undefined) {
  return useQuery({
    queryKey: merchantSettingsKeys.notifications(businessId ?? ''),
    queryFn: () => merchantSettingsService.getNotificationSettings(businessId ?? ''),
    enabled: Boolean(businessId),
  })
}

/** The form shows its own error, so no toast. */
export function useUpdateNotificationSettingsMutation(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: (settings: MerchantNotificationSettings) =>
      merchantSettingsService.updateNotificationSettings(businessId, settings),
    onSuccess: (saved) => queryClient.setQueryData(merchantSettingsKeys.notifications(businessId), saved),
  })
}
