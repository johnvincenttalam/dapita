import { randomBytes, randomInt } from 'node:crypto'

/** Opaque ids with a readable type prefix, e.g. `bk_q3Xr7…` (never an email or phone, doc §11.1). */
export function newId(prefix: string) {
  return `${prefix}_${randomBytes(12).toString('base64url')}`
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Short booking code for the front desk, e.g. `DP-7KQ2MX`. No 0/O or 1/I to misread. */
export function bookingReference() {
  let code = ''
  for (let i = 0; i < 6; i++) code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)]
  return `DP-${code}`
}
