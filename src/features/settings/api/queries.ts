import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { accountService } from '@/services/account.service'

export const accountKeys = {
  all: ['account'] as const,
  profile: () => [...accountKeys.all, 'profile'] as const,
  notifications: () => [...accountKeys.all, 'notifications'] as const,
}

export function useProfileQuery() {
  return useQuery({ queryKey: accountKeys.profile(), queryFn: accountService.getProfile })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: accountService.updateProfile,
    // The form shows failures inline through <FormError />.
    meta: { successMessage: 'Profile saved (in memory for this session)', showErrorToast: false },
    onSuccess: (profile) => queryClient.setQueryData(accountKeys.profile(), profile),
  })
}

export function useNotificationPreferencesQuery() {
  return useQuery({ queryKey: accountKeys.notifications(), queryFn: accountService.getNotificationPreferences })
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: accountService.updateNotificationPreferences,
    meta: { successMessage: 'Notification preferences saved (in memory for this session)', showErrorToast: false },
    onSuccess: (prefs) => queryClient.setQueryData(accountKeys.notifications(), prefs),
  })
}
