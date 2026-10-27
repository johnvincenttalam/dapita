import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#exceptions/api_error'

/**
 * The JSON body exactly as sent. The body parser turns empty strings into null
 * (config/bodyparser.ts), but the form schemas expect blank optional text as ''.
 */
export function formBody(request: HttpContext['request']): unknown {
  const raw = request.raw()
  return raw ? JSON.parse(raw) : {}
}

/** The part of a Zod schema used here, so the SPA's schemas need no Zod types on this side. */
interface Schema<T> {
  safeParse(
    input: unknown
  ):
    | { success: true; data: T }
    | { success: false; error: { issues: { message: string; path: PropertyKey[] }[] } }
}

/**
 * Checks input against one of the SPA's form schemas (`src/schemas`), so the
 * server applies exactly the rules and messages the form does. Fails as a 422
 * in the same `{ message, code, details }` shape as a VineJS error.
 */
export function validateWith<T>(schema: Schema<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const { issues } = result.error
  const details: Record<string, string[]> = {}
  for (const issue of issues) (details[issue.path.join('.')] ??= []).push(issue.message)
  throw new ApiError(issues[0]?.message ?? 'Check the details.', 422, 'validation', details)
}

/**
 * A staff note, resolution or reason: 5 to 1,000 characters once trimmed. `what`
 * completes the message, e.g. "a note" → "Write a note of at least 5 characters."
 */
export function requireText(value: unknown, what: string) {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (trimmed.length < 5) throw new ApiError(`Write ${what} of at least 5 characters.`, 422)
  if (trimmed.length > 1000) throw new ApiError(`Keep ${what} to 1,000 characters or fewer.`, 422)
  return trimmed
}
