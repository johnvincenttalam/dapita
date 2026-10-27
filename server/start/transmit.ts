/*
|--------------------------------------------------------------------------
| Realtime channel authorization
|--------------------------------------------------------------------------
|
| Who may listen on which channel (see app/services/realtime.ts). Events only
| name what changed; the data itself is always refetched through the API.
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'
import { isMember } from '#services/accounts'

transmit.authorize<{ userId: string }>('users/:userId', (ctx: HttpContext, { userId }) => {
  return ctx.auth.user?.id === userId
})

transmit.authorize<{ businessId: string }>(
  'businesses/:businessId',
  async (ctx: HttpContext, { businessId }) => {
    const user = ctx.auth.user
    return Boolean(user && (await isMember(user, businessId)))
  }
)
