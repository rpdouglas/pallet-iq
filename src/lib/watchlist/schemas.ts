import { z } from 'zod'
import { WATCHLIST_LOT_SOURCES } from '../../types/watchlistLot'

// units/currentBid/closesAt are all genuinely optional (a quick-add form off
// whatever's visible on a listing page, not every field is always shown) -
// the first optional-numeric/optional-date fields in the app.
// z.coerce.number() on an empty string coerces to 0 (Number('') === 0)
// rather than failing, so an empty optional field has to be normalized to
// undefined *before* coercion, not after - same class of z.coerce gotcha
// PALLETIQ-009's LandedCostForm hit for a required numeric field.
const optionalCoercedNumber = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.coerce.number().nonnegative('Must be 0 or more').optional(),
)

const optionalCoercedDate = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
  z.coerce.date().optional(),
)

export const watchlistLotFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  source: z.enum(WATCHLIST_LOT_SOURCES, { error: 'Select a source' }),
  category: z.string().trim().max(120),
  units: optionalCoercedNumber,
  currentBid: optionalCoercedNumber,
  closesAt: optionalCoercedDate,
  productUrl: z.url('Enter a valid URL'),
  notes: z.string().trim().max(2000),
})
// See LandedCostForm.tsx's comment: z.coerce/preprocess fields have a wider
// input type (raw <input> values arrive as strings) than their output type -
// RHF needs both.
export type WatchlistLotFormInput = z.input<typeof watchlistLotFormSchema>
export type WatchlistLotFormValues = z.output<typeof watchlistLotFormSchema>
