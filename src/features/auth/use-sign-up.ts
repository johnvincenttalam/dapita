import { useNavigate } from 'react-router'

import { useSignUpMutation } from '@/features/auth/api/queries'
import { verifyHref } from '@/features/auth/links'
import { ApiError, getErrorMessage } from '@/lib/api-client'
import type { SignUpRequest } from '@/services/auth.service'

interface SignUpErrorHandlers {
  /** The email already has an account: show it on the email field. */
  onEmailTaken: (message: string) => void
  /** Anything else: show it above the form. */
  onError: (message: string) => void
}

/**
 * Sends a sign-up and continues to email verification, which then returns the
 * user to `next` (plan step 5 exit criterion).
 */
export function useSignUp(next: string, { onEmailTaken, onError }: SignUpErrorHandlers) {
  const navigate = useNavigate()
  const signUp = useSignUpMutation()

  return async (request: SignUpRequest) => {
    try {
      await signUp.mutateAsync(request)
      await navigate(verifyHref({ next }), { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'email_taken') onEmailTaken(error.message)
      else onError(getErrorMessage(error))
    }
  }
}
