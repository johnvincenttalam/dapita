import { rm } from 'node:fs/promises'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Runs `handle` with the request's `file` part, then deletes the original the
 * body parser streamed to the OS temp folder, whatever the outcome: only the
 * WebP copies are kept.
 */
export async function withUpload<T>(
  request: HttpContext['request'],
  handle: (file: MultipartFile | null) => Promise<T>
) {
  const file = request.file('file')
  try {
    return await handle(file)
  } finally {
    if (file?.tmpPath) await rm(file.tmpPath, { force: true })
  }
}
