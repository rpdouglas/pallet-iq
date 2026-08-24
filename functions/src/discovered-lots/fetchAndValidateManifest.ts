import { MAX_FILE_SIZE_BYTES } from '../manifests/processManifestImport'
import { validateFile } from '../manifests/validateFile'
import type { ManifestFormat } from '../manifests/types'

const ALLOWED_HOST = 'restock.ca'
const USER_AGENT = 'PalletIQ-DiscoveredLotImport/1.0 (+https://mrt-pallet-iq.web.app; PALLETIQ-041)'

const CSV_CONTENT_TYPES = new Set(['text/csv', 'application/csv'])
const XLSX_CONTENT_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

export type FetchManifestResult =
  { ok: true; buffer: Buffer; format: ManifestFormat } | { ok: false; error: string }

function isAllowedHost(url: URL): boolean {
  return url.hostname === ALLOWED_HOST || url.hostname.endsWith(`.${ALLOWED_HOST}`)
}

function guessFormat(contentType: string | null): ManifestFormat | null {
  const type = (contentType ?? '').split(';')[0].trim().toLowerCase()
  if (CSV_CONTENT_TYPES.has(type)) return 'csv'
  if (XLSX_CONTENT_TYPES.has(type)) return 'xlsx'
  return null
}

// PALLETIQ-041 / ADR-0015. SSRF-safe by construction, not by validation-
// after-the-fact: the caller only ever passes a manifestUrl read from the
// restock_lots doc (never client input) - the host allowlist below is
// defense in depth on top of that, not the only guard. Rejects anything
// that isn't a real, magic-byte-validated CSV/XLSX (validateFile, the same
// check client-uploaded manifests already go through - ADR-0008) - a
// misreported Content-Type header alone is never trusted. PDF or any other
// unsupported format fails with an explicit, honest error rather than
// being force-parsed - no PDF-parsing capability exists in this codebase.
export async function fetchAndValidateManifest(manifestUrl: string): Promise<FetchManifestResult> {
  let url: URL
  try {
    url = new URL(manifestUrl)
  } catch {
    return { ok: false, error: 'manifestUrl is not a valid URL.' }
  }
  if (url.protocol !== 'https:' || !isAllowedHost(url)) {
    return { ok: false, error: 'manifestUrl is not from an allowlisted host.' }
  }

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) {
    return {
      ok: false,
      error: `Manifest fetch failed with status ${response.status.toString()}.`,
    }
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength !== null && Number(contentLength) > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: 'Manifest exceeds the maximum file size.' }
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: 'Manifest exceeds the maximum file size.' }
  }

  const guessedFormat = guessFormat(response.headers.get('content-type'))
  // restock.ca's real manifest shape is confirmed CSV (PALLETIQ-022), so an
  // ambiguous/unrecognized Content-Type still tries csv first rather than
  // giving up - xlsx stays a fallback for the cases the header does say so.
  const candidates: ManifestFormat[] = guessedFormat ? [guessedFormat] : ['csv', 'xlsx']

  for (const format of candidates) {
    const validation = await validateFile(buffer, format)
    if (validation.valid) {
      return { ok: true, buffer, format }
    }
  }

  return {
    ok: false,
    error: 'Manifest not available in a supported format (CSV or XLSX required).',
  }
}
