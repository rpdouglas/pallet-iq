# ADR-0008: Manifest upload security hardening

**Status:** Proposed
**Date:** 2026-08-11

## Context

`ADR-0006`/`PALLETIQ-008` explicitly deferred "deeper upload security
hardening — size limits enforcement, magic-byte/mimetype validation,
sandboxed execution, macro stripping" to this ticket. `PALLETIQ-011`'s own
`processManifestImport` changes didn't touch this path either. Today, the
only validation anywhere in the manifest upload pipeline is:

- **Client-side (`ImportForm.tsx`):** a file-extension check against the
  vendor's `manifestFormat` — trivially bypassed (rename any file to
  `.csv`/`.xlsx`), and JS-only so a direct API/curl caller skips it
  entirely.
- **`storage.rules`:** role gating only (`isTenantMember` +
  `tokenRole() in [...]`) — **no size limit, no content-type restriction at
  all.** A client can currently upload an arbitrarily large file straight
  into Cloud Storage before any function ever runs.
- **`processManifestImport.ts`:** a `buffer.length > MAX_FILE_SIZE_BYTES`
  check — but only _after_ downloading the entire file from Storage into
  function memory. The file has already consumed storage and bandwidth by
  the time this check fires; it can't stop an oversized upload from
  landing in Storage in the first place.
- **`exceljs`/`papaparse` themselves:** neither library executes macros —
  `exceljs` is a pure OOXML data reader with no VBA execution path, so "no
  macro execution" is already structurally true regardless of file
  content. What's _not_ true yet: nothing rejects a macro-enabled file
  (`.xlsm`, or a `.xlsx`-renamed macro-enabled file — both are ZIP/OOXML
  containers with a `xl/vbaProject.bin` entry) before it's accepted as a
  normal import, and nothing verifies a file's actual bytes match its
  claimed format at all.

`docs/projects/PROJ-PALLETIQ.md`'s risk table names the concern directly:
"Malicious manifest uploads (zip bombs, macros) → Sandboxed parsing, size
limits, validation in Phase 1." Resolved with the owner during scoping:
this ticket stays scoped to exactly what's named in the ticket title and
the Phase 1 QA criterion — size limits, sandboxed/resource-bounded
parsing, magic-byte validation, macro-file rejection. Real third-party
malware/AV scanning (a new paid vendor dependency, added per-import
latency) was considered and explicitly deferred — not part of this
ticket's scope.

## Decision

**1. Move the size limit to the actual write boundary.** Add
`request.resource.size < 10 * 1024 * 1024` to `storage.rules`' manifests
write rule (matching `MAX_FILE_SIZE_BYTES`, kept in sync via a comment on
both sides) — this is the real enforcement point; today nothing stops an
oversized file from ever landing in Storage. The existing function-side
`buffer.length` check stays too, as defense-in-depth in case the two
values ever drift, not removed.

**2. Verify actual file bytes server-side before trusting them.** A new
`functions/src/manifests/validateFile.ts`, called by
`processManifestImport` immediately after download and before
`parseFile`:

- **XLSX:** attempt `JSZip.loadAsync(buffer)` — this only parses the ZIP
  central directory (cheap, doesn't decompress entries), so it's a safe
  first move even against a hostile file. A load failure means the bytes
  aren't a real ZIP/OOXML container regardless of the claimed extension —
  reject as `Invalid XLSX file`. If it loads, check for a `xl/
vbaProject.bin` entry (the actual VBA binary every macro-enabled OOXML
  file contains, `.xlsm` or a renamed `.xlsx`) — reject as `Macro-enabled
files are not supported` if present. `jszip` is already exceljs's own
  direct dependency (`^3.10.1`, confirmed in `functions/node_modules`) —
  added as an explicit `functions/package.json` dependency rather than
  relied on transitively, since it's now imported directly in this repo's
  own source.
- **CSV:** reject if the buffer starts with the ZIP local-file-header
  signature (`0x50 0x4B 0x03 0x04`) — clearly not a CSV regardless of
  extension. Reject if a NUL byte (`0x00`) appears in the first 8 KB — a
  strong, cheap signal of a binary file; real CSVs never contain one.

**3. Bound parsing's resource usage explicitly, not implicitly.** Pin
`processManifestImport`'s Cloud Task options with explicit
`memory`/`timeoutSeconds` (`512MiB` / `120s`) rather than leaving them on
whatever the platform default happens to be — makes the resource sandbox
an intentional, documented control (per `ADR-0006`'s own framing: the
per-invocation Cloud Function _is_ the sandbox boundary, containing a
crash/OOM to that one execution) rather than an accidental default nobody
chose. Add a row-count circuit breaker in `processManifestImport` — reject
if `rawRows.length` exceeds 50,000 (no real manifest is anywhere near that
size; this catches a degenerate/adversarial file cheaply without needing
byte-level decompression-ratio tracking).

**4. Client-side size check, UX only.** `ImportForm.tsx` gains a
same-as-server 10 MB client-side check for immediate feedback before
upload even starts — explicitly documented as a UX nicety, not a security
boundary (the boundary is `storage.rules` + server-side validation above,
both of which hold even if this is bypassed).

No Firestore schema or RBAC change — no new collection, no role change.
`imports/{importId}.error` gains new possible string values (`Invalid
XLSX file`, `Macro-enabled files are not supported`, `Too many rows`,
size-limit messages) but that field is already free-text, not an enum.

## Alternatives considered

- **Real malware/AV scanning (ClamAV Cloud Function, VirusTotal API,
  etc.).** Resolved with the owner during scoping: rejected for this
  ticket. A real cost/vendor/latency tradeoff, and not what's actually
  named in the ticket title or the Phase 1 QA criterion — those name size
  limits, sandboxed parsing, and no-macro-execution specifically. Revisit
  as its own ticket if a real threat model emerges that structural/
  dependency-level hardening doesn't cover (e.g. once uploads accept
  richer file types than CSV/XLSX).
- **Content-type allowlisting in `storage.rules`.** Rejected: browsers are
  inconsistent about what MIME type they attach to a `.csv` file
  (`text/csv`, `text/plain`, `application/vnd.ms-excel` all seen in
  practice depending on OS/browser), so an allowlist strict enough to
  matter risks false-positive rejections of legitimate uploads. Client-
  declared content-type is also trivially spoofable, so it wouldn't add
  real security over the magic-byte check that already inspects actual
  bytes server-side. Size limit at the Storage Rules layer is worth doing
  (objective, unspoofable by the time Storage enforces it); content-type
  filtering isn't, given the byte-level check downstream is strictly more
  reliable.
- **Full ZIP decompression-bomb protection (tracking decompressed-size
  ratios per entry).** More thorough, but real complexity for a threat
  `exceljs`'s per-invocation Cloud Function sandbox plus the row-count
  circuit breaker already contains at acceptable cost (a crashed/OOM'd
  single task invocation, not a shared-resource or cross-tenant impact).
  Revisit if the row-count/memory bounds prove insufficient in practice.
- **Reject macro-enabled files by extension alone (`.xlsm`).** Simpler,
  but doesn't catch a macro-enabled workbook renamed to `.xlsx` — exactly
  the bypass the `xl/vbaProject.bin` structural check exists to close.
  Extension-based rejection alone would be security theater, not a real
  control.

## Consequences

- `functions/package.json` gains `jszip` as a direct dependency (already
  present transitively via `exceljs`, now imported directly).
- `storage.rules` gains its first size-limit enforcement anywhere in the
  repo — worth remembering as the pattern for any future upload path
  (`PALLETIQ-018`'s Storage bucket, image uploads, etc.) that needs the
  same treatment.
- `processManifestImport`'s explicit `memory: '512MiB'`/`timeoutSeconds:
120` needs a redeploy to take effect, same as every functions change this
  project.
- A legitimately huge manifest (>50,000 rows or >10 MB) now fails cleanly
  with a clear `imports.error` message instead of either succeeding
  slowly or being silently accepted today — if a real vendor ever needs
  larger imports, these caps are the first thing to revisit, not treated
  as permanent.
- Malware/AV scanning stays a named, deferred gap (see Alternatives) —
  logged here so it isn't mistaken for an oversight later, matching how
  `ADR-0006` itself named this ticket's scope up front.
