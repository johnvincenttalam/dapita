import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { sessionKeys } from '@/features/auth/api/queries'
import { profileService } from '@/services/profile.service'
import type { MyProfile } from '@/types/account'
import type { Session } from '@/types/auth'

export const accountKeys = {
  all: ['account'] as const,
  profile: () => [...accountKeys.all, 'profile'] as const,
  consents: () => [...accountKeys.all, 'consents'] as const,
}

export const myProfileQueryOptions = queryOptions({
  queryKey: accountKeys.profile(),
  queryFn: () => profileService.getMyProfile(),
})

export function useMyProfileQuery() {
  return useQuery(myProfileQueryOptions)
}

export function useMyConsentsQuery() {
  return useQuery({ queryKey: accountKeys.consents(), queryFn: () => profileService.getMyConsents() })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: profileService.updateMyProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData<MyProfile>(accountKeys.profile(), profile)
      // The header and account menu show the name from the session.
      queryClient.setQueryData<Session>(sessionKeys.current, (current) =>
        current ? { ...current, name: profile.name } : current,
      )
    },
    meta: { successMessage: 'Profile saved.' },
  })
}

export function useRequestDeletionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: profileService.requestAccountDeletion,
    onSuccess: (request) =>
      queryClient.setQueryData<MyProfile>(accountKeys.profile(), (current) =>
        current ? { ...current, deletionRequest: request } : current,
      ),
  })
}
