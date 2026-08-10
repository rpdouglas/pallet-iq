import { z } from 'zod'
import { MANIFEST_FORMATS } from '../../types/vendor'

export const vendorFormSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name is required').max(120),
  manifestFormat: z.enum(MANIFEST_FORMATS, { error: 'Select a manifest format' }),
  contactEmail: z.email('Enter a valid email address').or(z.literal('')),
  contactPhone: z.string().trim().max(40),
  terms: z.string().trim().max(2000),
})
export type VendorFormValues = z.infer<typeof vendorFormSchema>
