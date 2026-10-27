import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authService } from '@/services/auth.service'
import type { Session } from '@/types/auth'

export const sessionKeys = {
  current: ['session'] as const,
}

export const sessionQueryOptions = queryOptions({
  queryKey: sessionKeys.current,
  queryFn: () => authService.getSession(),
  // The session only changes through sign-in/out, which update the cache directly.
  staleTime: Infinity,
})

/** The signed-in user (`null` when signed out) plus the query state. */
export function useSession() {
  const query = useQuery(sessionQueryOptions)
  return { ...query, user: query.data ?? null }
}

export function useSignInMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.signIn,
    onSuccess: (user) => queryClient.setQueryData<Session>(sessionKeys.current, user),
    meta: { showErrorToast: false },
  })
}

export function useSignOutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      queryClient.setQueryData<Session>(sessionKeys.current, null)
      // Drop everything that belonged to the previous user except the session itself.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionKeys.current[0] })
    },
    meta: { successMessage: 'You have been signed out.' },
  })
}

/** Creates an account and signs it in (the service sets the session). */
export function useSignUpMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.signUp,
    onSuccess: (user) => queryClient.setQueryData<Session>(sessionKeys.current, user),
    meta: { showErrorToast: false },
  })
}

export function useVerifyEmailMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.verifyEmail,
    onSuccess: (user) => {
      // The link may be opened while signed in as someone else; only update the matching session.
      queryClient.setQueryData<Session>(sessionKeys.current, (current) =>
        current?.id === user.id ? { ...current, emailVerified: true } : current,
      )
    },
    meta: { showErrorToast: false },
  })
}

export function usePasswordResetMutation() {
  return useMutation({ mutationFn: authService.requestPasswordReset, meta: { showErrorToast: false } })
}
