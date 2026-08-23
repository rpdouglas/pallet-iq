import { describe, expect, it, vi, beforeAll } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ItemScanCapture } from './ItemScanCapture'

beforeAll(() => {
  // jsdom doesn't implement createObjectURL - thumbnails just need a stub
  // URL, not a real blob URL, for this component's tests to render.
  URL.createObjectURL = vi.fn(() => 'blob:fake')
  URL.revokeObjectURL = vi.fn()
})

function photoFile(name = 'photo.jpg') {
  return new File(['bytes'], name, { type: 'image/jpeg' })
}

function cameraInput() {
  return screen.getByLabelText<HTMLInputElement>('Take photo')
}

function libraryInput() {
  return screen.getByLabelText<HTMLInputElement>('Choose from device')
}

function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

describe('ItemScanCapture', () => {
  it('disables submit until at least one photo is added', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: /identify item/i })).toBeDisabled()
  })

  it('offers both a camera capture and a device/library picker', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    expect(cameraInput()).toHaveAttribute('capture', 'environment')
    expect(libraryInput()).not.toHaveAttribute('capture')
    expect(libraryInput()).toHaveAttribute('multiple')
  })

  it('adds a photo, shows a thumbnail, and enables submit', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(libraryInput(), [photoFile()])

    expect(screen.getByAltText('Capture 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /identify item/i })).not.toBeDisabled()
  })

  // PALLETIQ-034 regression: a second photo added via a second, separate
  // selection on the camera input (a fresh DOM node each time, since it's
  // keyed by photo count) must show up too - previously the second add
  // silently produced no visible change.
  it('adds a second photo captured after the first, via a fresh input node', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(cameraInput(), [photoFile('a.jpg')])
    expect(screen.getByAltText('Capture 1')).toBeInTheDocument()

    selectFiles(cameraInput(), [photoFile('b.jpg')])
    expect(screen.getByAltText('Capture 2')).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('removes a photo when its remove button is clicked', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(libraryInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }))

    expect(screen.queryByAltText('Capture 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /identify item/i })).toBeDisabled()
  })

  it('caps at 5 photos and shows an error past the limit', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(
      libraryInput(),
      Array.from({ length: 6 }, (_, i) => photoFile(`photo-${i.toString()}.jpg`)),
    )

    expect(screen.getAllByRole('img')).toHaveLength(5)
    expect(screen.getByText(/up to 5 photos/i)).toBeInTheDocument()
  })

  it('hides both add-photo controls once the cap is reached', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(
      libraryInput(),
      Array.from({ length: 5 }, (_, i) => photoFile(`photo-${i.toString()}.jpg`)),
    )

    expect(screen.queryByLabelText('Take photo')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Choose from device')).not.toBeInTheDocument()
  })

  it('calls onSubmit with the selected photos', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ItemScanCapture onSubmit={onSubmit} />)

    const file = photoFile()
    selectFiles(libraryInput(), [file])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith([file])
    })
  })

  it('shows an error message when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Upload failed'))
    render(<ItemScanCapture onSubmit={onSubmit} />)

    selectFiles(libraryInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Upload failed')).toBeInTheDocument()
  })
})
