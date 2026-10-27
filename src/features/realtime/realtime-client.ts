import { Transmit } from '@adonisjs/transmit-client'

import { env } from '@/lib/env'
import { createRandomId } from '@/lib/ids'

/**
 * Connects to the server's event stream at `${VITE_API_BASE_URL}/__transmit`.
 * Same origin as the API, so the session cookie authorizes each subscription.
 */
export function createRealtimeClient() {
  return new Transmit({
    baseUrl: new URL(env.apiBaseUrl, window.location.origin).href.replace(/\/$/, ''),
    // The default generator uses crypto.randomUUID, which a phone on http://<LAN IP> doesn't have.
    uidGenerator: createRandomId,
  })
}
