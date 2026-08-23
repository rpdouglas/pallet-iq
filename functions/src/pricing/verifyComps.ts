import type { PricingComp, PricingResult } from './types'

// Real fetch to a real site - keep this lightweight, not a hang risk for
// priceItemScanWorker.ts's own 300s budget. Comps are verified in
// parallel, so worst case this adds ~this long, not this-times-comp-count.
const VERIFY_TIMEOUT_MS = 8000

// Only comps with a source tag known to map to a specific expected domain
// get checked - a comp with no source (e.g. from an older cached
// PricingResult written before PALLETIQ-035's source field existed) has
// no domain claim to verify against, so it passes through unchanged.
const EXPECTED_DOMAINS: Partial<Record<NonNullable<PricingComp['source']>, string[]>> = {
  kijiji_new: ['kijiji.ca'],
  kijiji_used: ['kijiji.ca'],
  ebay_sold: ['ebay.ca', 'ebay.com'],
}

function hostMatchesDomain(hostname: string, domains: string[]): boolean {
  const host = hostname.toLowerCase()
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`))
}

// Statuses a real marketplace returns to block naive server-to-server
// fetches, not because the specific page is broken - discovered via a live
// check against real ebay.ca/.com during this ticket's own implementation:
// eBay 403s *every* plain fetch from this environment (homepage, search
// results, alike), regardless of User-Agent/Accept/Sec-Fetch headers. Since
// Cloud Functions' egress is itself a well-known datacenter IP range, the
// same blocking is expected in production, not just this sandbox. Treating
// these as "verification failed" would null out the URL on virtually every
// real eBay comp - worse than not verifying at all, since it's a false,
// noisy "down" signal on links that are actually fine. Kijiji hasn't shown
// this behavior in testing, but the same defensive treatment covers it too
// if that changes.
const INCONCLUSIVE_STATUSES = new Set([403, 429])

type VerifyOutcome = 'verified' | 'failed' | 'inconclusive'

async function checkUrlAgainstDomain(url: string, domains: string[]): Promise<VerifyOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, VERIFY_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    })
    if (INCONCLUSIVE_STATUSES.has(response.status)) return 'inconclusive'
    if (!response.ok) return 'failed'
    return hostMatchesDomain(new URL(response.url || url).hostname, domains) ? 'verified' : 'failed'
  } catch {
    return 'failed'
  } finally {
    clearTimeout(timer)
  }
}

// PALLETIQ-037. Gemini's pricing research reports comp URLs it found via
// live web search - never checked server-side before this ticket, so a
// hallucinated comp (a plausible title/price with a URL that doesn't
// actually resolve, or resolves somewhere unrelated to the claimed
// source) would look identical to a real one once rendered as a
// clickable link in PricingPanel.tsx, on a signal that drives a real
// buy/pass money decision. Verifies each displayed comp's URL actually
// resolves (2xx, following redirects) and lands on the domain its
// `source` tag claims - not a full anti-hallucination framework, no
// content/price matching against the fetched page, just "does this link
// go where it claims to go," per this ticket's own explicitly-bounded
// scope.
//
// A comp that *fails* verification (or has no url/source to check) keeps
// its title/price - that signal may still be real even if the specific
// link isn't verifiable, and dropping it outright would discard real
// pricing information over a single bad link - but its url is nulled
// out, removing the one misleading affordance (a clickable link that
// looks legitimate but wasn't actually confirmed). PricingPanel.tsx
// already omits the link icon entirely for any comp with url: null, so
// this needs no UI change. A comp whose check comes back *inconclusive*
// (bot-blocked, see INCONCLUSIVE_STATUSES above) is left completely
// untouched instead - keeping an unverified-but-plausible link is a much
// smaller risk than manufacturing a false "broken link" signal on a real
// one. sampleSize/comps.length are intentionally unaffected either way -
// a failed or inconclusive check doesn't change how much price signal
// was found, only whether that signal linked out.
export async function verifyPricingComps(pricing: PricingResult): Promise<PricingResult> {
  if (pricing.comps.length === 0) {
    return pricing
  }

  const results = await Promise.all(
    pricing.comps.map(async (comp): Promise<{ comp: PricingComp; failed: boolean }> => {
      if (!comp.url || !comp.source) {
        return { comp, failed: false }
      }
      const domains = EXPECTED_DOMAINS[comp.source]
      if (!domains) {
        return { comp, failed: false }
      }
      const outcome = await checkUrlAgainstDomain(comp.url, domains)
      if (outcome === 'inconclusive') return { comp, failed: false }
      return {
        comp: outcome === 'verified' ? comp : { ...comp, url: null },
        failed: outcome === 'failed',
      }
    }),
  )

  const failedCount = results.filter((r) => r.failed).length
  const comps = results.map((r) => r.comp)

  if (failedCount === 0) {
    return { ...pricing, comps }
  }

  return {
    ...pricing,
    comps,
    factors: [
      ...pricing.factors,
      {
        label: `${failedCount.toString()} comp link(s) could not be verified and were shown without a link`,
        direction: 'down',
        explanation: null,
      },
    ],
  }
}
