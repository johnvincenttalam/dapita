import { photoMessages, photoRules } from '@/config/photos'
import type { Business } from '@/types/business'

/**
 * A quick browser-side check by MIME type. The server looks at the file's real
 * content, so this only saves a round trip.
 */
export function photoFileProblem(file: { type: string; size: number }): string | undefined {
  if (!(photoRules.acceptedTypes as readonly string[]).includes(file.type)) return photoMessages.notAPhoto
  if (file.size > photoRules.maxBytes) return photoMessages.tooLarge
  return undefined
}

/** Alt text is generated, never typed: the shop's name, plus the position for gallery photos. */
export function photoAlt(shopName: string, kind: 'cover' | 'gallery', position?: number): string {
  return kind === 'cover' ? shopName : `${shopName}, photo ${position}`
}

export function hasCover(business: Pick<Business, 'photos'>): boolean {
  return business.photos.some((photo) => photo.kind === 'cover')
}
