import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from './Button'
import { SelectField } from './form/SelectField'
import { TextField } from './form/TextField'
import type { Vendor } from '../types/vendor'

// Duck-typed rather than z.instanceof(FileList) - jsdom (used by this
// component's own tests) doesn't implement the DataTransfer API needed to
// construct a real FileList, only a FileList-shaped array-like.
const importFormSchema = z.object({
  vendorId: z.string().min(1, 'Select a vendor'),
  file: z
    .custom<FileList>((val) => typeof val === 'object' && val !== null && 'length' in val, {
      message: 'Select a file',
    })
    .refine((files) => files.length === 1, 'Select a file'),
  // PALLETIQ-022 / ADR-0010. Plain string, not z.coerce.number() - the
  // field is optional (most vendors provide real per-item cost data) and
  // z.coerce.number() on an empty string coerces to 0, indistinguishable
  // from "the owner really did pay $0 for this lot." Parsed in submit only
  // when non-empty.
  totalPurchasePrice: z.string().optional(),
})
type ImportFormValues = z.infer<typeof importFormSchema>

// PALLETIQ-012 / ADR-0008. UX only, not the security boundary - matches
// functions/src/manifests/processManifestImport.ts's MAX_FILE_SIZE_BYTES
// and storage.rules' upload size rule, both of which enforce this for real
// even if this client-side check is bypassed.
const MAX_CLIENT_FILE_SIZE_BYTES = 10 * 1024 * 1024

interface ImportFormProps {
  vendors: Vendor[]
  onSubmit: (values: { vendorId: string; file: File; totalPurchasePrice?: number }) => Promise<void>
  onCancel: () => void
}

// No documented file-upload pattern exists yet in docs/design/components.md
// (flagged in PALLETIQ-008's scope note rather than silently invented) - the
// file input here is plain/native rather than styled to match TextField,
// since TextField's treatment doesn't meaningfully apply to a file picker.
export function ImportForm({ vendors, onSubmit, onCancel }: ImportFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ImportFormValues>({ resolver: zodResolver(importFormSchema) })
  const { onChange: onVendorFieldChange, ...vendorField } = register('vendorId')

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId)

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    const vendor = vendors.find((v) => v.id === values.vendorId)
    if (!vendor) {
      setFormError('Vendor not found.')
      return
    }
    const file = values.file[0]
    if (!file) {
      setFormError('Select a file.')
      return
    }
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== vendor.manifestFormat) {
      setFormError(
        `${vendor.name}'s manifests are ${vendor.manifestFormat.toUpperCase()} files - selected file is .${extension ?? '?'}.`,
      )
      return
    }
    if (file.size > MAX_CLIENT_FILE_SIZE_BYTES) {
      const maxMb = MAX_CLIENT_FILE_SIZE_BYTES / (1024 * 1024)
      setFormError(`File is too large - the limit is ${maxMb.toString()} MB.`)
      return
    }
    let totalPurchasePrice: number | undefined
    if (values.totalPurchasePrice) {
      const parsed = Number(values.totalPurchasePrice)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setFormError('Total purchase price must be a non-negative number.')
        return
      }
      totalPurchasePrice = parsed
    }
    try {
      await onSubmit({ vendorId: values.vendorId, file, totalPurchasePrice })
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
      <SelectField
        label="Vendor"
        error={errors.vendorId?.message}
        {...vendorField}
        onChange={(event) => {
          void onVendorFieldChange(event)
          setSelectedVendorId(event.target.value)
        }}
      >
        <option value="">Select a vendor</option>
        {vendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.name} ({vendor.manifestFormat.toUpperCase()})
          </option>
        ))}
      </SelectField>
      <div className="flex flex-col gap-1">
        <label htmlFor="manifest-file" className="text-label text-slate-gray font-medium">
          Manifest file{selectedVendor ? ` (.${selectedVendor.manifestFormat})` : ''}
        </label>
        <input
          id="manifest-file"
          type="file"
          accept=".csv,.xlsx"
          className="text-body"
          {...register('file')}
        />
        {errors.file ? <p className="text-label text-danger">{errors.file.message}</p> : null}
      </div>
      <TextField
        label="Total purchase price (optional)"
        type="number"
        step="0.01"
        min="0"
        placeholder="Only needed if this manifest has no per-item cost"
        {...register('totalPurchasePrice')}
      />
      {formError ? <p className="text-label text-danger">{formError}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Importing…' : 'Import manifest'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
