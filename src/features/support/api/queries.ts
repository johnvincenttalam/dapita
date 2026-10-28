import { useMutation, useQueryClient } from '@tanstack/react-query'

import { adminKeys } from '@/features/admin/api/queries'
import { supportService } from '@/services/support.service'

/** The form shows its own error. Staff screens open in the same browser re-read the case list. */
export function useSendSupportRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { showErrorToast: false },
    mutationFn: supportService.sendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.cases() }),
  })
}
