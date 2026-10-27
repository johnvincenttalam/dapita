import { Exception } from '@adonisjs/core/exceptions'

/**
 * An error the client should see as is. The handler sends it as the
 * `{ message, code }` body the SPA's API client reads (src/types/api.ts).
 */
export default class ApiError extends Exception {
  constructor(message: string, status: number, code?: string) {
    super(message, { status, code })
  }
}

export const signInRequired = () => new ApiError('Sign in to continue.', 401)
export const noBusinessAccess = () => new ApiError('You don’t have access to this business.', 403)
