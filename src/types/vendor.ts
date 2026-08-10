export type ManifestFormat = 'csv' | 'xlsx'

export const MANIFEST_FORMATS: readonly ManifestFormat[] = ['csv', 'xlsx']

export interface Vendor {
  id: string
  name: string
  manifestFormat: ManifestFormat
  contactEmail: string
  contactPhone: string
  /** Pricing/terms notes - omitted from the UI for the Warehouse role, see rbac-ui-patterns.md. */
  terms: string
}
