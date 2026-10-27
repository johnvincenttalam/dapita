import { env } from '@/lib/env'
import type { ApiErrorBody } from '@/types/api'

/** Normalised error thrown for every failed request. */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: Record<string, string[]>

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.code
    this.details = body?.details
  }
}

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Serialised as JSON. */
  body?: unknown
  /** Appended as a query string; null/undefined values are skipped. */
  query?: Record<string, QueryValue>
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const base = env.apiBaseUrl.replace(/\/$/, '')
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function request<T>(path: string, { body, query, headers, ...init }: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Send cookies for same-origin session auth. Tokens should live in
      // httpOnly cookies set by your backend, not in frontend code.
      credentials: 'include',
    })
  } catch {
    throw new ApiError('Network error. Check your connection and try again.', 0)
  }

  if (response.status === 204) return undefined as T

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload: unknown = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const errorBody = (isJson ? payload : undefined) as ApiErrorBody | undefined
    throw new ApiError(
      errorBody?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorBody,
    )
  }

  return payload as T
}

/** Thin typed wrapper around fetch. Swap for axios/ky if your project needs more. */
export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}

/** Turns any thrown value into a user-facing message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Something went wrong. Please try again.'
}
