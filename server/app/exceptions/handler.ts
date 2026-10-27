import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as vineErrors } from '@vinejs/vine'
import { errors as authErrors } from '@adonisjs/auth'
import { errors as lucidErrors } from '@adonisjs/lucid'
import ApiError from '#exceptions/api_error'

/** The error body the SPA's API client reads (src/types/api.ts). */
interface ErrorBody {
  message: string
  code?: string
  details?: Record<string, string[]>
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Every error leaves as `{ message, code?, details? }`, so the frontend can
   * show the message as written.
   */
  async handle(error: unknown, ctx: HttpContext) {
    const [status, body] = this.toErrorBody(error)
    return ctx.response.status(status).send(body)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }

  private toErrorBody(error: unknown): [number, ErrorBody] {
    if (error instanceof ApiError) {
      return [error.status, { message: error.message, code: error.code, details: error.details }]
    }
    if (error instanceof vineErrors.E_VALIDATION_ERROR) {
      const issues = error.messages as { field: string; message: string }[]
      const details: Record<string, string[]> = {}
      for (const issue of issues) (details[issue.field] ??= []).push(issue.message)
      return [
        422,
        { message: issues[0]?.message ?? 'Check the details.', code: 'validation', details },
      ]
    }
    if (error instanceof authErrors.E_UNAUTHORIZED_ACCESS) {
      return [401, { message: 'Sign in to continue.' }]
    }
    if (error instanceof authErrors.E_INVALID_CREDENTIALS) {
      return [401, { message: 'Incorrect email or password.' }]
    }
    if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
      return [404, { message: 'We couldn’t find that.' }]
    }

    const status = (error as { status?: number }).status ?? 500
    if (status < 500) {
      return [status, { message: (error as Error).message || 'The request couldn’t be completed.' }]
    }
    const detail = this.debug && error instanceof Error ? ` (${error.message})` : ''
    return [status, { message: `Something went wrong on our side. Please try again.${detail}` }]
  }
}
