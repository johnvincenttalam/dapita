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
  /** One answer per user; `null` is a signed-out viewer, whose query never runs. */
  interests: (userId: ID | null) => [...accountKeys.all, 'interests', userId] as const,
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

/**
 * The categories the signed-in customer is here for, cached per user so another account's answer
 * never shows. Only this app changes a user's answer, so it stays fresh for that user.
 */
export function useMyInterestsQuery(userId: ID | null) {
  return useQuery({
    queryKey: accountKeys.interests(userId),
    queryFn: () => profileService.getMyInterests(),
    staleTime: Infinity,
    enabled: userId !== null,
  })
}

/** Saves the signed-in user's categories; `userId` says whose cached answer the reply updates. */
export function useUpdateInterestsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryIds }: { userId: ID; categoryIds: ID[] }) => profileService.updateMyInterests(categoryIds),
    onSuccess: (interests, { userId }) =>
      queryClient.setQueryData<CustomerInterests>(accountKeys.interests(userId), interests),
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
