/** Builds an auth URL, keeping `next` so the user returns to what they were doing. */
function withNext(path: string, next?: string | null, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra)
  if (next) params.set('next', next)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export const signInHref = (next?: string | null) => withNext('/auth/sign-in', next)
export const getStartedHref = (next?: string | null) => withNext('/get-started', next)
export const signUpHref = (next?: string | null) => withNext('/auth/sign-up', next)
export const businessSignUpHref = () => '/business/sign-up'
export const verifyHref = ({ next, token }: { next?: string | null; token?: string }) =>
  withNext('/auth/verify', next, token ? { token } : undefined)

/** Where a new business owner goes after verifying: the listing set-up (plan step 7). */
export const BUSINESS_ONBOARDING_PATH = '/business/onboarding'
