/**
 * A random key for one attempt at a mutation (e.g. `Idempotency-Key`), so a
 * retried submit can't create a duplicate booking (doc §11.1).
 */
export function createIdempotencyKey() {
  return createRandomId()
}

/**
 * A random UUID-style id. `crypto.randomUUID` is missing on insecure origins (e.g. a LAN IP
 * during development, like a phone opening http://192.168.x.x:5174), but `getRandomValues` isn't.
 */
export function createRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6]! & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80 // variant
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}
