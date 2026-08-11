import JSZip from 'jszip'
import type { ManifestFormat } from './types'

export type ValidateFileResult = { valid: true } | { valid: false; error: string }

// A ZIP local-file-header signature ("PK\x03\x04") - every XLSX file is a
// ZIP archive, so this is also useful as a negative signal for CSV (a real
// CSV never starts with it).
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04])

// How far into a CSV buffer to scan for a NUL byte - a strong, cheap signal
// of binary data; real CSV text never contains one. 8 KB is enough to catch
// a mislabeled binary file without reading the whole buffer.
const CSV_BINARY_SCAN_BYTES = 8192

// The actual VBA macro binary every macro-enabled OOXML workbook contains
// (.xlsm, or a macro-enabled workbook renamed to .xlsx) - checking for this
// entry catches the rename bypass that a file-extension check alone can't.
const MACRO_ENTRY_PATH = 'xl/vbaProject.bin'

async function validateXlsx(buffer: Buffer): Promise<ValidateFileResult> {
  let zip: JSZip
  try {
    // Only parses the ZIP central directory - doesn't decompress entries,
    // so this is safe to run against a hostile/corrupt file. See ADR-0008.
    zip = await JSZip.loadAsync(buffer)
  } catch {
    return { valid: false, error: 'Invalid XLSX file - the file is not a readable spreadsheet.' }
  }

  if (zip.file(MACRO_ENTRY_PATH)) {
    return { valid: false, error: 'Macro-enabled files are not supported.' }
  }

  return { valid: true }
}

function validateCsv(buffer: Buffer): ValidateFileResult {
  if (buffer.subarray(0, 4).equals(ZIP_SIGNATURE)) {
    return {
      valid: false,
      error: 'Invalid CSV file - the file appears to be a different format.',
    }
  }

  const scanRegion = buffer.subarray(0, CSV_BINARY_SCAN_BYTES)
  if (scanRegion.includes(0x00)) {
    return {
      valid: false,
      error: 'Invalid CSV file - the file appears to contain binary data.',
    }
  }

  return { valid: true }
}

// PALLETIQ-012 / ADR-0008. Verifies the downloaded bytes actually match the
// claimed format before parseFile ever runs on them - extension/mimetype
// alone (checked client-side and via storage.rules role gating) can't catch
// a renamed or macro-enabled file.
export function validateFile(buffer: Buffer, format: ManifestFormat): Promise<ValidateFileResult> {
  if (format === 'xlsx') {
    return validateXlsx(buffer)
  }
  return Promise.resolve(validateCsv(buffer))
}
