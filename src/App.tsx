import { PackageSearch } from 'lucide-react'

function App() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-cloud-gray text-ink-navy">
      <div className="text-center">
        <PackageSearch className="text-brand-blue mx-auto mb-3" size={40} strokeWidth={1.75} />
        <h1 className="font-display text-h1 font-extrabold">PalletIQ</h1>
        <p className="text-label text-slate-gray mt-2">Scaffold only — Phase 0 in progress.</p>
      </div>
    </main>
  )
}

export default App
