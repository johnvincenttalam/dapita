/**
 * Shrinks a photo to a WebP data URL for the mock backend, which has no server to do it.
 * Never enlarges. Browser only (createImageBitmap and canvas).
 */
export async function resizeImageToDataUrl(file: File, maxWidth = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxWidth / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/webp', 0.8)
  } finally {
    bitmap.close()
  }
}
