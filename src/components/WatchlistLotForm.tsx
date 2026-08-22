import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from './Button'
import { TextField } from './form/TextField'
import { SelectField } from './form/SelectField'
import {
  watchlistLotFormSchema,
  type WatchlistLotFormInput,
  type WatchlistLotFormValues,
} from '../lib/watchlist/schemas'
import { WATCHLIST_LOT_SOURCES, WATCHLIST_LOT_SOURCE_LABELS } from '../types/watchlistLot'

interface WatchlistLotFormProps {
  onSubmit: (values: WatchlistLotFormValues) => Promise<void>
  onCancel: () => void
}

const EMPTY_VALUES: WatchlistLotFormInput = {
  title: '',
  source: 'bstock',
  category: '',
  units: '',
  currentBid: '',
  closesAt: '',
  productUrl: '',
  notes: '',
}

// docs/design/components.md's Form inputs pattern, extended here for the
// first optional-numeric and first date/time fields in the app (see
// lib/watchlist/schemas.ts's comment on the z.coerce empty-string gotcha).
// "Quick-add" per ADR-0009 - paste a URL and whatever's visible on the
// listing page, not a full manifest, so every field but title/source/
// productUrl is optional.
export function WatchlistLotForm({ onSubmit, onCancel }: WatchlistLotFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WatchlistLotFormInput, unknown, WatchlistLotFormValues>({
    resolver: zodResolver(watchlistLotFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onSubmit(values)
    } catch (error) {
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong. Please try again.',
      )
    }
  })

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" noValidate>
      <TextField label="Title" error={errors.title?.message} {...register('title')} />
      <SelectField label="Source" error={errors.source?.message} {...register('source')}>
        {WATCHLIST_LOT_SOURCES.map((source) => (
          <option key={source} value={source}>
            {WATCHLIST_LOT_SOURCE_LABELS[source]}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Listing URL"
        type="url"
        placeholder="https://…"
        error={errors.productUrl?.message}
        {...register('productUrl')}
      />
      <TextField
        label="Category"
        placeholder="Electronics, apparel, mixed…"
        error={errors.category?.message}
        {...register('category')}
      />
      <div className="flex gap-4">
        <TextField
          label="Units"
          type="number"
          min="0"
          step="1"
          className="flex-1"
          error={errors.units?.message}
          {...register('units')}
        />
        <TextField
          label="Current bid"
          type="number"
          min="0"
          step="0.01"
          className="flex-1"
          error={errors.currentBid?.message}
          {...register('currentBid')}
        />
      </div>
      <TextField
        label="Closes at"
        type="datetime-local"
        error={errors.closesAt?.message}
        {...register('closesAt')}
      />
      <TextField label="Notes" error={errors.notes?.message} {...register('notes')} />
      {formError ? <p className="text-label text-danger">{formError}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Add lot'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
