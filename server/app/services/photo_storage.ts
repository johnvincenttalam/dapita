import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import { photoRules } from '#shared/domain'

/**
 * Shop photo files on local disk, under `UPLOADS_DIR` (default `storage/uploads`).
 * Callers only see relative paths and storage keys, so a cloud driver can replace
 * this module later without touching them.
 */

export function uploadsRoot() {
  return resolve(app.makePath(), env.get('UPLOADS_DIR') ?? 'storage/uploads')
}

/** Folder and file names as this module writes them: no dots in front, so no `..` or hidden files. */
const SAFE_SEGMENT = /^[\w-][\w.-]*$/

/**
 * The absolute path of a file under the uploads folder, or `undefined` when the
 * path could point anywhere else (`..`, encoded slashes, backslashes, absolute paths).
 */
export function resolveUploadPath(relativePath: string): string | undefined {
  const segments = relativePath.split('/')
  if (!segments.every((segment) => SAFE_SEGMENT.test(segment))) return undefined
  const root = uploadsRoot()
  const filePath = resolve(root, ...segments)
  return filePath.startsWith(root + sep) ? filePath : undefined
}

export async function putFile(relativePath: string, data: Buffer) {
  const filePath = resolveUploadPath(relativePath)
  if (!filePath) throw new Error(`Not a path inside the uploads folder: ${relativePath}`)
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, data)
}

/** Deletes every copy of each photo. A failure is logged, never thrown: the row is already saved. */
export async function deleteUploaded(storageKeys: string[]) {
  const paths = storageKeys.flatMap((key) =>
    photoRules.widths.map((width) => `${key}-${width}.webp`)
  )
  await Promise.all(
    paths.map(async (relativePath) => {
      const filePath = resolveUploadPath(relativePath)
      if (!filePath) {
        logger.warn({ relativePath }, 'Skipped deleting a photo outside the uploads folder')
        return
      }
      try {
        await rm(filePath, { force: true })
      } catch (error) {
        logger.error({ err: error, relativePath }, 'Couldn’t delete a photo file')
      }
    })
  )
}
