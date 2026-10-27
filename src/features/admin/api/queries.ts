import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { discoveryKeys } from '@/features/discovery/api/queries'
import { shopKeys } from '@/features/shops/api/queries'
import type { ModerationInput } from '@/schemas/moderation'
import { adminService, type CategoryInput } from '@/services/admin.service'
import type { AdminCategory, CaseDetails, MerchantReview } from '@/types/admin'

export const adminKeys = {
  all: ['admin'] as const,
  merchants: () => [...adminKeys.all, 'merchants'] as const,
  merchant: (id: string) => [...adminKeys.all, 'merchants', id] as const,
  cases: () => [...adminKeys.all, 'cases'] as const,
  case: (id: string) => [...adminKeys.all, 'cases', id] as const,
}

export const useMerchantsQuery = ({ enabled = true } = {}) =>
  useQuery({ queryKey: adminKeys.merchants(), queryFn: () => adminService.listMerchants(), enabled })

export const useMerchantReviewQuery = (id: string) =>
  useQuery({ queryKey: adminKeys.merchant(id), queryFn: () => adminService.getMerchantReview(id) })

/** The dialog shows its own error. A decision changes what the public sees, so shop pages re-read too. */
export function useModerateMerchantMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: (input: ModerationInput) => adminService.moderateMerchant(id, input),
    onSuccess: (review) => {
      queryClient.setQueryData<MerchantReview>(adminKeys.merchant(id), review)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.merchants() }),
        queryClient.invalidateQueries({ queryKey: shopKeys.all }),
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all }),
      ])
    },
  })
}

export const useCasesQuery = ({ enabled = true } = {}) =>
  useQuery({ queryKey: adminKeys.cases(), queryFn: () => adminService.listCases(), enabled })

export const useCaseQuery = (id: string) =>
  useQuery({ queryKey: adminKeys.case(id), queryFn: () => adminService.getCase(id) })

/** Take, note or resolve. Forms show their own errors. */
export function useCaseStepMutation(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: (step: { kind: 'take' } | { kind: 'note' | 'resolve'; text: string }) =>
      step.kind === 'take'
        ? adminService.takeCase(id)
        : step.kind === 'note'
          ? adminService.addCaseNote(id, step.text)
          : adminService.resolveCase(id, step.text),
    onSuccess: (details) => {
      queryClient.setQueryData<CaseDetails>(adminKeys.case(id), details)
      return queryClient.invalidateQueries({ queryKey: adminKeys.cases() })
    },
  })
}

// ─── Categories and featured shops ───────────────────────────────────────────

export const useAdminCategoriesQuery = () =>
  useQuery({ queryKey: [...adminKeys.all, 'categories'] as const, queryFn: () => adminService.listCategories() })

/** Any change to the taxonomy shows on the public category pages and search. */
export function useCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: (
      change:
        | { kind: 'update'; id: string; input: CategoryInput }
        | { kind: 'move'; id: string; direction: 'up' | 'down' }
        | { kind: 'add'; parentId: string; name: string },
    ) =>
      change.kind === 'update'
        ? adminService.updateCategory(change.id, change.input)
        : change.kind === 'move'
          ? adminService.moveCategory(change.id, change.direction)
          : adminService.addSubcategory(change.parentId, change.name),
    onSuccess: (categories) => {
      queryClient.setQueryData<AdminCategory[]>([...adminKeys.all, 'categories'], categories)
      return queryClient.invalidateQueries({ queryKey: discoveryKeys.all })
    },
  })
}

export function useSetFeaturedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => adminService.setFeatured(id, featured),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.merchants() }),
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all }),
      ]),
  })
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const useAdminUsersQuery = (query: string) =>
  useQuery({
    queryKey: [...adminKeys.all, 'users', query] as const,
    queryFn: () => adminService.listUsers(query),
    placeholderData: (previous) => previous,
  })

export function useAccountActionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: ({ id, action, reason }: { id: string; action: 'suspend' | 'reinstate'; reason: string }) =>
      action === 'suspend' ? adminService.suspendUser(id, reason) : adminService.reinstateUser(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'users'] }),
  })
}
