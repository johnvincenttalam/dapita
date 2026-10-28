import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import ApiError from '#exceptions/api_error'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 *
 * A suspended account's session ends at once: the request is refused and the
 * session cleared, so a suspension takes effect without waiting for a sign-out.
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards)
    if (ctx.auth.user?.suspendedAt) {
      await ctx.auth.use('web').logout()
      throw new ApiError('This account is suspended. Contact Dapita support.', 403)
    }
    return next()
  }
}
