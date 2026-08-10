import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from './Button'
import { TextField } from './form/TextField'
import { SelectField } from './form/SelectField'
import { vendorFormSchema, type VendorFormValues } from '../lib/vendors/schemas'
import { MANIFEST_FORMATS } from '../types/vendor'

interface VendorFormProps {
  initialValues?: VendorFormValues
  submitLabel: string
  onSubmit: (values: VendorFormValues) => Promise<void>
  onCancel: () => void
}

const EMPTY_VALUES: VendorFormValues = {
  name: '',
  manifestFormat: 'csv',
  contactEmail: '',
  contactPhone: '',
  terms: '',
}

export function VendorForm({ initialValues, submitLabel, onSubmit, onCancel }: VendorFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: initialValues ?? EMPTY_VALUES,
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
      <TextField label="Vendor name" error={errors.name?.message} {...register('name')} />
      <SelectField
        label="Manifest format"
        error={errors.manifestFormat?.message}
        {...register('manifestFormat')}
      >
        {MANIFEST_FORMATS.map((format) => (
          <option key={format} value={format}>
            {format.toUpperCase()}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Contact email"
        type="email"
        error={errors.contactEmail?.message}
        {...register('contactEmail')}
      />
      <TextField
        label="Contact phone"
        type="tel"
        error={errors.contactPhone?.message}
        {...register('contactPhone')}
      />
      <TextField
        label="Terms"
        error={errors.terms?.message}
        placeholder="Pricing, payment terms, discounts…"
        {...register('terms')}
      />
      {formError ? <p className="text-label text-danger">{formError}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
