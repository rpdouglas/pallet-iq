import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from './Button'
import { TextField } from './form/TextField'

// The first numeric input field in the app - no currency-symbol input
// masking, plain numbers coerced by Zod; the "$" prefix is a display-time
// convention only (matches unitCost's existing .toFixed(2) treatment).
const landedCostFormSchema = z.object({
  freightCost: z.coerce.number().nonnegative('Must be 0 or more'),
  otherFees: z.coerce.number().nonnegative('Must be 0 or more'),
})
// z.coerce fields have a wider input type (unknown, since the raw <input>
// value arrives as a string) than their output type (number) - RHF needs
// both: form state/defaultValues use the input shape, onSubmit receives
// the coerced output shape.
type LandedCostFormInput = z.input<typeof landedCostFormSchema>
type LandedCostFormValues = z.output<typeof landedCostFormSchema>

interface LandedCostFormProps {
  initialValues: LandedCostFormValues
  onSubmit: (values: LandedCostFormValues) => Promise<void>
}

export function LandedCostForm({ initialValues, onSubmit }: LandedCostFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LandedCostFormInput, unknown, LandedCostFormValues>({
    resolver: zodResolver(landedCostFormSchema),
    defaultValues: initialValues,
  })

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    setSaved(false)
    try {
      await onSubmit(values)
      setSaved(true)
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
      <div className="flex gap-4">
        <TextField
          label="Freight cost"
          type="number"
          step="0.01"
          min="0"
          className="flex-1"
          error={errors.freightCost?.message}
          {...register('freightCost')}
        />
        <TextField
          label="Other fees"
          type="number"
          step="0.01"
          min="0"
          className="flex-1"
          error={errors.otherFees?.message}
          {...register('otherFees')}
        />
      </div>
      {formError ? <p className="text-label text-danger">{formError}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
        {saved ? <p className="text-label text-success">Saved.</p> : null}
      </div>
    </form>
  )
}
