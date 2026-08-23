// PALLETIQ-036. Real phone camera photos run 3-8MB each; with no
// compression, processItemScan.ts had to base64-inline every photo into a
// single Gemini call (up to ~66MB of base64 text for 5 photos), which is
// what made multi-photo scans "never finish." Resize/re-encode client-side
// before upload instead - cheaper for the browser to do than for the
// backend to receive, and it also shrinks the Storage upload itself.
const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  })
}

// Never throws - any decode/encode failure (most notably: some iOS camera
// flows can still hand back a real HEIC blob that createImageBitmap can't
// decode in most browsers) falls back to the original, uncompressed file
// rather than blocking the upload. Also falls back if the re-encoded blob
// isn't actually smaller (a small/already-compressed source image), so this
// never uploads a same-or-larger file than what was captured.
export async function compressPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    try {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
      const width = Math.round(bitmap.width * scale)
      const height = Math.round(bitmap.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(bitmap, 0, 0, width, height)

      const blob = await canvasToBlob(canvas)
      if (!blob || blob.size >= file.size) return file

      const baseName = file.name.replace(/\.\w+$/, '')
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
    } finally {
      bitmap.close()
    }
  } catch (err) {
    console.warn('compressPhoto: falling back to the original file', err)
    return file
  }
}
