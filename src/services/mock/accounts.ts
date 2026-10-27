import type { ConsentRecord, DeletionRequest } from '@/types/account'
import type { AccountAction } from '@/types/admin'
import type { SessionUser } from '@/types/auth'
import type { ID, ISODateTime } from '@/types/common'

// MOCK: accounts created through sign-up, plus profile edits, consents and deletion
// requests for every account (built-in demo accounts included). Persisted to
// localStorage, separately from the booking database. Only mock services use it.

export const MOCK_ACCOUNTS_KEY = 'glamspot-mock-accounts'
const MOCK_ACCOUNTS_VERSION = 1

export interface MockRegisteredAccount {
  user: SessionUser
  /** Not a secure hash. It only keeps the typed password out of storage as plain text. */
  passwordFingerprint: string
}

export interface MockAccountState {
  name?: string
  phone?: string
  emailVerified?: boolean
  createdAt?: ISODateTime
  consents?: ConsentRecord[]
  deletionRequest?: DeletionRequest
  /** Set while an admin has suspended the account; sign-in and sessions are refused. */
  suspendedAt?: ISODateTime
  suspendedReason?: string
  /** Suspensions and reinstatements, oldest first. */
  accountActions?: AccountAction[]
}

export interface MockAccountsStore {
  version: number
  createdAt: ISODateTime
  accounts: MockRegisteredAccount[]
  /** Per-user changes layered over the account's defaults. */
  state: Record<ID, MockAccountState>
}

const emptyStore = (): MockAccountsStore => ({
  version: MOCK_ACCOUNTS_VERSION,
  createdAt: new Date().toISOString(),
  accounts: [],
  state: {},
})

// Fallback when localStorage is unavailable (private mode, blocked storage).
let memoryStore: MockAccountsStore | null = null

export function readMockAccounts(): MockAccountsStore {
  try {
    const raw = localStorage.getItem(MOCK_ACCOUNTS_KEY)
    const parsed = raw ? (JSON.parse(raw) as MockAccountsStore) : null
    if (parsed?.version === MOCK_ACCOUNTS_VERSION) return parsed
  } catch {
    if (memoryStore) return structuredClone(memoryStore)
  }
  const fresh = emptyStore()
  saveMockAccounts(fresh)
  return fresh
}

function saveMockAccounts(store: MockAccountsStore) {
  try {
    localStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(store))
  } catch {
    memoryStore = store
  }
}

/** Applies `change` to the stored accounts and returns its result. */
export function updateMockAccounts<T>(change: (store: MockAccountsStore) => T): T {
  const store = readMockAccounts()
  const result = change(store)
  saveMockAccounts(store)
  return result
}

/** MOCK ONLY: a non-cryptographic fingerprint (FNV-1a). A real auth provider handles passwords. */
export function mockPasswordFingerprint(password: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < password.length; index += 1) {
    hash ^= password.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16)
}
