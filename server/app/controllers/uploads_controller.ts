import { stat } from 'node:fs/promises'
import type { HttpContext } from '@adonisjs/core/http'
import ApiError from '#exceptions/api_error'
import { resolveUploadPath } from '#services/photo_storage'

/**
 * Uploaded shop photos, public like the shops they belong to. Every upload gets
 * a fresh name, so a file never changes and browsers can keep it for a year.
 */
export default class UploadsController {
  async show({ params, response }: HttpContext) {
    const segments: string[] = params['*'] ?? []
    const filePath = resolveUploadPath(segments.join('/'))
    const stats = filePath ? await stat(filePath).catch(() => undefined) : undefined
    if (!filePath || !stats?.isFile()) throw new ApiError('Not found.', 404)
    response.header('Cache-Control', 'public, max-age=31536000, immutable')
    return response.download(filePath)
  }
}
