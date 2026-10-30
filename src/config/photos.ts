/** Shop photo limits. The server enforces the same numbers on upload. */
export const photoRules = {
  maxGalleryPhotos: 8,
  /** How many gallery photos the shop page shows. */
  shownOnShopPage: 4,
  /** 10 MB per photo. */
  maxBytes: 10 * 1024 * 1024,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  /** The widths the server writes each photo at. */
  widths: [320, 640, 1280],
} as const

export const photoMessages: Record<
  | 'notAPhoto'
  | 'tooLarge'
  | 'galleryFull'
  | 'noFile'
  | 'notFound'
  | 'cantRemoveCover'
  | 'staleOrder'
  | 'needsCoverToGoLive',
  string
> = {
  notAPhoto: 'That file isn’t a photo. Use JPG, PNG or WebP.',
  tooLarge: 'Photos can be up to 10 MB.',
  galleryFull: 'You can add up to 8 gallery photos.',
  noFile: 'Choose a photo to upload.',
  notFound: 'We couldn’t find that photo.',
  cantRemoveCover: 'Your shop needs a cover photo. Replace it instead.',
  staleOrder: 'Your photos changed. Reload and try again.',
  needsCoverToGoLive: 'This shop needs a cover photo before it can go live.',
}
