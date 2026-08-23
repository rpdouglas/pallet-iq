import { describe, expect, it, vi, beforeAll } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ItemScanCapture } from './ItemScanCapture'

beforeAll(() => {
  // jsdom doesn't implement createObjectURL - thumbnails just need a stub
  // URL, not a real blob URL, for this component's tests to render.
  URL.createObjectURL = vi.fn(() => 'blob:fake')
})

function photoFile(name = 'photo.jpg') {
  return new File(['bytes'], name, { type: 'image/jpeg' })
}

function fileInput() {
  return screen.getByLabelText<HTMLInputElement>('Add photo')
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

  it('adds a photo, shows a thumbnail, and enables submit', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(fileInput(), [photoFile()])

    expect(screen.getByAltText('Capture 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /identify item/i })).not.toBeDisabled()
  })

  it('removes a photo when its remove button is clicked', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo 1' }))

    expect(screen.queryByAltText('Capture 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /identify item/i })).toBeDisabled()
  })

  it('caps at 5 photos and shows an error past the limit', () => {
    render(<ItemScanCapture onSubmit={vi.fn()} />)

    selectFiles(
      fileInput(),
      Array.from({ length: 6 }, (_, i) => photoFile(`photo-${i.toString()}.jpg`)),
    )

    expect(screen.getAllByRole('img')).toHaveLength(5)
    expect(screen.getByText(/up to 5 photos/i)).toBeInTheDocument()
  })

  it('calls onSubmit with the selected photos', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ItemScanCapture onSubmit={onSubmit} />)

    const file = photoFile()
    selectFiles(fileInput(), [file])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith([file])
    })
  })

  it('shows an error message when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Upload failed'))
    render(<ItemScanCapture onSubmit={onSubmit} />)

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Upload failed')).toBeInTheDocument()
  })
})
