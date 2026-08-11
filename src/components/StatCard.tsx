// Pallet-IQ-Design-System.md §4 Cards/Stat tiles: white or Cloud Gray bg,
// ~12px rounded corners, subtle shadow, Slate Gray label, bold Ink Navy
// value. No delta indicator yet - nothing in this app has a comparison
// period to show a trend against.
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <p className="text-label text-slate-gray">{label}</p>
      <p className="text-metric text-ink-navy font-bold">{value}</p>
    </div>
  )
}
