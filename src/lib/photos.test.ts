import { describe, expect, it } from 'vitest'

import { photoMessages } from '@/config/photos'
import { photoAlt, photoFileProblem } from '@/lib/photos'

describe('photoFileProblem', () => {
  it('rejects anything that isn’t a JPEG, PNG or WebP', () => {
    expect(photoFileProblem({ type: 'image/gif', size: 1 })).toBe(photoMessages.notAPhoto)
  })

  it('rejects a photo over 10 MB, but accepts exactly 10 MB', () => {
    expect(photoFileProblem({ type: 'image/png', size: 10485761 })).toBe(photoMessages.tooLarge)
    expect(photoFileProblem({ type: 'image/webp', size: 10485760 })).toBeUndefined()
  })
})

describe('photoAlt', () => {
  it('names the shop, and numbers gallery photos', () => {
    expect(photoAlt('Kulot Studio', 'cover')).toBe('Kulot Studio')
    expect(photoAlt('Kulot Studio', 'gallery', 3)).toBe('Kulot Studio, photo 3')
  })
})
