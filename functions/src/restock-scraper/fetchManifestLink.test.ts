import { describe, expect, it } from 'vitest'
import { extractManifestLink } from './fetchManifestLink'

// These fixtures are synthetic, not captured from a real restock.ca detail
// page - see the module's own doc comment for why. They exist to pin this
// function's documented behavior, not to prove it matches the live site.
describe('extractManifestLink', () => {
  it('finds a link whose text mentions "manifest"', () => {
    const html = `<a href="/files/lot-1016710-manifest.pdf">Download Manifest</a>`
    expect(extractManifestLink(html, 'https://www.restock.ca/1016710/')).toBe(
      'https://www.restock.ca/files/lot-1016710-manifest.pdf',
    )
  })

  it('finds a link whose href mentions "manifest" even with generic text', () => {
    const html = `<a href="https://cdn.restock.ca/manifests/1016710.xlsx">Click here</a>`
    expect(extractManifestLink(html, 'https://www.restock.ca/1016710/')).toBe(
      'https://cdn.restock.ca/manifests/1016710.xlsx',
    )
  })

  it('falls back to a plain .pdf link when nothing mentions "manifest"', () => {
    const html = `<a href="/files/lot-1016710.pdf">Lot details</a>`
    expect(extractManifestLink(html, 'https://www.restock.ca/1016710/')).toBe(
      'https://www.restock.ca/files/lot-1016710.pdf',
    )
  })

  it('resolves a relative href against the page URL', () => {
    const html = `<a href="manifest.pdf">Manifest</a>`
    expect(extractManifestLink(html, 'https://www.restock.ca/1016710/')).toBe(
      'https://www.restock.ca/1016710/manifest.pdf',
    )
  })

  it('returns null when no candidate link exists', () => {
    const html = `<a href="/about/">About</a><a href="/contact/">Contact</a>`
    expect(extractManifestLink(html, 'https://www.restock.ca/1016710/')).toBeNull()
  })

  it('returns null for a page with no links at all', () => {
    expect(
      extractManifestLink('<p>No links here.</p>', 'https://www.restock.ca/1016710/'),
    ).toBeNull()
  })

  // PALLETIQ-044. Confirmed live: restock.ca's real site-wide nav link to
  // /furniture/unmanifested-furniture/ (a category page, not a manifest)
  // was matching every lot detail page's first candidate anchor before
  // the word-boundary fix, giving all ~500 active production lots the
  // identical wrong manifestUrl.
  it('does not match "unmanifested-furniture" as a false positive (PALLETIQ-044)', () => {
    const hrefHtml = `<a href="/furniture/unmanifested-furniture/">Furniture</a>`
    expect(extractManifestLink(hrefHtml, 'https://www.restock.ca/1016710/')).toBeNull()

    const textHtml = `<a href="/furniture/">Unmanifested Furniture</a>`
    expect(extractManifestLink(textHtml, 'https://www.restock.ca/1016710/')).toBeNull()
  })

  it('still finds a real manifest link on a page that also has the unmanifested-furniture nav link', () => {
    const html = `
      <a href="/furniture/unmanifested-furniture/">Furniture</a>
      <a href="/files/lot-1016710-manifest.pdf">Download Manifest</a>
    `
    expect(extractManifestLink(html, 'https://www.restock.ca/1016710/')).toBe(
      'https://www.restock.ca/files/lot-1016710-manifest.pdf',
    )
  })
})
