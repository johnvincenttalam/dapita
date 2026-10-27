import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { sessionKeys } from '@/features/auth/api/queries'
import { discoveryKeys } from '@/features/discovery/api/queries'
import { merchantServiceKeys } from '@/features/merchant/api/service-queries'
import { shopKeys } from '@/features/shops/api/queries'
import type { BusinessProfileInput, ClosureInput, PoliciesInput } from '@/schemas/business'
import { merchantBusinessService, type BusinessProfile } from '@/services/merchant-business.service'
import type { Business, WeeklyHours } from '@/types/business'

export const merchantBusinessKeys = {
  all: ['merchant-business'] as const,
  detail: (businessId: string) => [...merchantBusinessKeys.all, businessId] as const,
}

export function useBusinessProfileQuery(businessId: string | undefined) {
  return useQuery({
    queryKey: merchantBusinessKeys.detail(businessId ?? ''),
    queryFn: () => merchantBusinessService.getBusiness(businessId ?? ''),
    enabled: Boolean(businessId),
  })
}

/**
 * One save on the profile page: the saved business replaces the cached one, and the public
 * shop pages and search re-read it. Forms show their own errors, so no toast unless asked.
 */
function useBusinessMutation<TInput>(
  businessId: string,
  save: (businessId: string, input: TInput) => Promise<Business>,
  { showErrorToast = false, refreshSession = false, refreshMenu = false } = {},
) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast },
    mutationFn: (input: TInput) => save(businessId, input),
    onSuccess: (business) => {
      queryClient.setQueryData<BusinessProfile>(merchantBusinessKeys.detail(businessId), (profile) =>
        profile ? { ...profile, business } : profile,
      )
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: shopKeys.all }),
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all }),
        // The dashboard shows the business name from the session.
        refreshSession ? queryClient.invalidateQueries({ queryKey: sessionKeys.current }) : undefined,
        // The categories a service can go under come from the business's own categories.
        refreshMenu ? queryClient.invalidateQueries({ queryKey: merchantServiceKeys.menu(businessId) }) : undefined,
      ])
    },
  })
}

export const useUpdateProfileMutation = (businessId: string) =>
  useBusinessMutation<BusinessProfileInput>(businessId, merchantBusinessService.updateProfile, {
    refreshSession: true,
    refreshMenu: true,
  })

export const useUpdateHoursMutation = (businessId: string) =>
  useBusinessMutation<WeeklyHours>(businessId, merchantBusinessService.updateHours)

export const useAddClosureMutation = (businessId: string) =>
  useBusinessMutation<ClosureInput>(businessId, merchantBusinessService.addClosure)

/** Removing happens from a list, not a form, so failures toast. */
export const useDeleteClosureMutation = (businessId: string) =>
  useBusinessMutation<string>(businessId, merchantBusinessService.deleteClosure, { showErrorToast: true })

export const useUpdatePoliciesMutation = (businessId: string) =>
  useBusinessMutation<PoliciesInput>(businessId, merchantBusinessService.updatePolicies)

export const useSubmitForReviewMutation = (businessId: string) =>
  useBusinessMutation<void>(businessId, (id) => merchantBusinessService.submitForReview(id))
