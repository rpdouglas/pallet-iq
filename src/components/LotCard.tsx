import { ExternalLink, FileText, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from './Badge'
import { Button } from './Button'
import { Spinner } from './Spinner'
import { computeMarginPct, formatMoney } from '../lib/format'
import { getConditionBadgeTone } from '../lib/restockLots/conditionBadgeTone'
import { IMPORT_STATUS_STYLES } from '../lib/discoveredLots/importStatusStyles'
import type { ImportSummary } from '../types/manifest'
import type { RestockLot } from '../types/restockLot'

interface LotCardProps {
  lot: RestockLot
  lotImport: ImportSummary | undefined
  canWrite: boolean
  onImport: (lotId: string) => void
  importPending: boolean
  onDismiss: (lot: RestockLot) => void
}

// Mobile card rendering of a single Discovered Lot row - see
// docs/design/mobile-responsive.md's "Exception: Discovered Lots list view"
// and docs/reports/SPEC-DISCOVERED-LOTS-CARD-VIEW-001.md. Preserves every
// field and interaction DiscoveredLotsPage.tsx's <table> row has today; this
// is presentational only, all data/mutation state stays owned by the page.
export function LotCard({
  lot,
  lotImport,
  canWrite,
  onImport,
  importPending,
  onDismiss,
}: LotCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <a
          href={lot.productUrl}
          target="_blank"
          rel="noreferrer"
          className="text-brand-blue inline-flex items-center gap-1 font-medium hover:underline"
        >
          {lot.title}
          <ExternalLink size={14} />
        </a>
        {lot.manifestUrl ? (
          <a
            href={lot.manifestUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Manifest for ${lot.title}`}
            className="text-slate-gray hover:text-brand-blue"
          >
            <FileText size={14} />
          </a>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone="slate">{lot.category}</Badge>
        <Badge tone={getConditionBadgeTone(lot.condition)}>{lot.condition}</Badge>
        <span className="text-label text-slate-gray">Lot #{lot.id}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-label text-slate-gray">Units</p>
          <p className="text-body text-ink-navy font-bold">{lot.units}</p>
        </div>
        <div>
          <p className="text-label text-slate-gray">MSRP</p>
          <p className="text-body text-ink-navy font-bold">{formatMoney(lot.msrp)}</p>
        </div>
        <div>
          <p className="text-label text-slate-gray">Price</p>
          <p className="text-body text-ink-navy font-bold">{formatMoney(lot.price)}</p>
        </div>
        <div>
          <p className="text-label text-slate-gray">Margin</p>
          <p className="text-body text-ink-navy font-bold">
            {(() => {
              const pct = computeMarginPct(lot.msrp, lot.price)
              return pct !== null ? `${pct.toString()}%` : '—'
            })()}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-cloud-gray pt-3">
        <span className="text-label text-slate-gray">
          {lot.firstSeenAt.toDate().toLocaleDateString()}
        </span>

        {canWrite ? (
          <div className="flex items-center gap-3">
            {lotImport?.status === 'queued' || lotImport?.status === 'processing' ? (
              <span
                className={`inline-flex items-center gap-2 ${IMPORT_STATUS_STYLES[lotImport.status]}`}
              >
                <Spinner className="h-4 w-4" />
                {lotImport.status === 'processing' ? 'Importing…' : 'Queued…'}
              </span>
            ) : lotImport?.status === 'completed' ? (
              <Link
                to={`/manifests/${lotImport.id}`}
                className={`font-medium hover:underline ${IMPORT_STATUS_STYLES.completed}`}
              >
                Imported
              </Link>
            ) : lot.manifestUrl ? (
              <div className="flex flex-col items-end gap-1">
                <Button
                  className="min-h-11"
                  disabled={importPending}
                  onClick={() => {
                    onImport(lot.id)
                  }}
                >
                  {lotImport?.status === 'failed' ? 'Try again' : 'Import'}
                </Button>
                {lotImport?.status === 'failed' ? (
                  <span className={`text-label ${IMPORT_STATUS_STYLES.failed}`}>Import failed</span>
                ) : null}
              </div>
            ) : (
              <span className="text-slate-gray">—</span>
            )}

            <button
              type="button"
              aria-label={`Remove ${lot.title}`}
              onClick={() => {
                onDismiss(lot)
              }}
              className="text-danger cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
