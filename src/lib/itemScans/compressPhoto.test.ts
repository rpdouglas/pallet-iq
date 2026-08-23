import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compressPhoto } from './compressPhoto'

function photoFile(name = 'photo.jpg', sizeBytes = 5_000_000) {
  return new File([new Uint8Array(sizeBytes)], name, { type: 'image/jpeg' })
}

function mockBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() }
}

function stubCanvas(resultBlob: Blob | null) {
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback,
  ) {
    callback(resultBlob)
  })
  return { drawImage }
}

describe('compressPhoto', () => {
  let createImageBitmapMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createImageBitmapMock = vi.fn()
    // jsdom doesn't implement createImageBitmap at all.
    globalThis.createImageBitmap = createImageBitmapMock as unknown as typeof createImageBitmap
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downscales a large image and returns a smaller re-encoded jpeg File', async () => {
    createImageBitmapMock.mockResolvedValueOnce(mockBitmap(4032, 3024))
    const smallBlob = new Blob([new Uint8Array(200_000)], { type: 'image/jpeg' })
    const { drawImage } = stubCanvas(smallBlob)

    const original = photoFile('IMG_0001.jpg', 5_000_000)
    const result = await compressPhoto(original)

    expect(result.type).toBe('image/jpeg')
    expect(result.name).toBe('IMG_0001.jpg')
    expect(result.size).toBe(smallBlob.size)
    expect(result.size).toBeLessThan(original.size)
    expect(drawImage).toHaveBeenCalled()
  })

  it('only downscales, never upscales, an already-small image', async () => {
    createImageBitmapMock.mockResolvedValueOnce(mockBitmap(400, 300))
    const { drawImage } = stubCanvas(new Blob([new Uint8Array(50_000)], { type: 'image/jpeg' }))

    await compressPhoto(photoFile('small.jpg', 100_000))

    // drawImage(bitmap, 0, 0, width, height) - width/height should stay at
    // the bitmap's original size, not get scaled up.
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 400, 300)
  })

  it('falls back to the original file when the re-encoded blob is not smaller', async () => {
    createImageBitmapMock.mockResolvedValueOnce(mockBitmap(800, 600))
    const largerBlob = new Blob([new Uint8Array(999_999)], { type: 'image/jpeg' })
    stubCanvas(largerBlob)

    const original = photoFile('photo.jpg', 100_000)
    const result = await compressPhoto(original)

    expect(result).toBe(original)
  })

  it('falls back to the original file when createImageBitmap rejects (e.g. undecodable HEIC)', async () => {
    createImageBitmapMock.mockRejectedValueOnce(new Error('unsupported image type'))

    const original = photoFile('photo.heic', 4_000_000)
    const result = await compressPhoto(original)

    expect(result).toBe(original)
  })

  it('falls back to the original file when toBlob yields null (encoder failure)', async () => {
    createImageBitmapMock.mockResolvedValueOnce(mockBitmap(1200, 900))
    stubCanvas(null)

    const original = photoFile('photo.jpg', 3_000_000)
    const result = await compressPhoto(original)

    expect(result).toBe(original)
  })

  it('falls back to the original file when canvas 2d context is unavailable', async () => {
    createImageBitmapMock.mockResolvedValueOnce(mockBitmap(1200, 900))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const original = photoFile('photo.jpg', 3_000_000)
    const result = await compressPhoto(original)

    expect(result).toBe(original)
  })
})
