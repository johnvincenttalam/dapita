import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { sessionKeys } from '@/features/auth/api/queries'
import { profileService } from '@/services/profile.service'
import type { CustomerInterests, MyProfile } from '@/types/account'
import type { Session } from '@/types/auth'
import type { ID } from '@/types/common'

export const accountKeys = {
  all: ['account'] as const,
  profile: () => [...accountKeys.all, 'profile'] as const,
  consents: () => [...accountKeys.all, 'consents'] as const,
  interests: () => [...accountKeys.all, 'interests'] as const,
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

/** The categories the signed-in customer is here for. Only this app changes them, so never stale. */
export function useMyInterestsQuery(enabled: boolean) {
  return useQuery({
    queryKey: accountKeys.interests(),
    queryFn: () => profileService.getMyInterests(),
    staleTime: Infinity,
    enabled,
  })
}

export function useUpdateInterestsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (categoryIds: ID[]) => profileService.updateMyInterests(categoryIds),
    onSuccess: (interests) => queryClient.setQueryData<CustomerInterests>(accountKeys.interests(), interests),
    // useInterests says when the latest pick fails; stale and background failures stay quiet.
    meta: { showErrorToast: false },
  })
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
