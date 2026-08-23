import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

const MIN_PHOTOS = 1
const MAX_PHOTOS = 5

interface ItemScanCaptureProps {
  onSubmit: (photos: File[]) => Promise<void>
}

// PALLETIQ-034. No documented multi-photo capture pattern exists yet in
// docs/design/components.md (same gap ImportForm's single-file input notes
// for uploads generally) - two plain native file inputs (one camera-only via
// `capture`, one a plain device/library picker) plus thumbnail previews,
// rather than inventing a heavier custom picker for a first instance of
// this pattern. Each input is keyed by the current photo count so React
// mounts a fresh DOM node per use - the standard workaround for mobile
// Safari's known bug where reusing the same `capture` input node for a
// second photo can silently fail to fire its change event (PALLETIQ-034).
export function ItemScanCapture({ onSubmit }: ItemScanCaptureProps) {
  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Recreated only when the photo list itself changes, and revoked on
  // cleanup - createObjectURL previously ran on every render with no
  // revocation, leaking a blob URL each time (PALLETIQ-034).
  const photoUrls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos])
  useEffect(() => {
    return () => {
      photoUrls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [photoUrls])

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    setPhotos((current) => {
      const combined = [...current, ...Array.from(files)]
      if (combined.length > MAX_PHOTOS) {
        setError(`You can add up to ${MAX_PHOTOS.toString()} photos.`)
        return combined.slice(0, MAX_PHOTOS)
      }
      return combined
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index))
  }

  const submit = async () => {
    if (photos.length < MIN_PHOTOS) {
      setError('Add at least one photo.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(photos)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-slate-gray">
        Add {MIN_PHOTOS}-{MAX_PHOTOS} photos: an overall shot, the label/tag, the barcode, and any
        damage.
      </p>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((photo, index) => (
            <div key={`${photo.name}-${index.toString()}`} className="relative aspect-square">
              <img
                src={photoUrls[index]}
                alt={`Capture ${(index + 1).toString()}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${(index + 1).toString()}`}
                onClick={() => {
                  removePhoto(index)
                }}
                className="bg-ink-navy absolute -top-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full text-white"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {photos.length < MAX_PHOTOS ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="border-slate-gray text-body text-slate-gray flex min-h-11 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
            Take photo
            <input
              key={`camera-${photos.length.toString()}`}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                addPhotos(event.target.files)
              }}
            />
          </label>
          <label className="border-slate-gray text-body text-slate-gray flex min-h-11 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
            Choose from device
            <input
              key={`library-${photos.length.toString()}`}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                addPhotos(event.target.files)
              }}
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="text-label text-danger">{error}</p> : null}

      <Button
        onClick={() => void submit()}
        disabled={submitting || photos.length < MIN_PHOTOS}
        className="min-h-11"
      >
        {submitting ? 'Uploading…' : 'Identify item'}
      </Button>
    </div>
  )
}
