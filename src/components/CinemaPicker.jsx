import { useCinema } from '../lib/cinema'

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm ${
        active
          ? 'border-accent bg-accent font-semibold text-on-accent'
          : 'border-line-strong text-ink-2 hover:border-accent'
      }`}
    >
      {children}
    </button>
  )
}

// Pemilih bioskop. Pilihannya dibagi ke semua halaman lewat CinemaProvider.
export default function CinemaPicker({ className = '' }) {
  const { cinemas, selected, select } = useCinema()
  if (cinemas.length === 0) return null

  return (
    <div className={className}>
      {/* HP: dropdown (hemat tempat). Layar lebar: deretan chip. */}
      <select
        aria-label="Pilih bioskop"
        value={selected ? String(selected.id) : ''}
        onChange={(e) => select(e.target.value ? e.target.value : null)}
        className="min-h-11 w-full rounded-xl border border-line-strong bg-panel px-3 sm:hidden"
      >
        <option value="">Semua bioskop</option>
        {cinemas.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name.replace(/^KursiKu\s+/, '')} · {c.city}
          </option>
        ))}
      </select>
      <div role="group" aria-label="Pilih bioskop" className="hidden flex-wrap gap-2 sm:flex">
        <Chip active={!selected} onClick={() => select(null)}>
          Semua bioskop
        </Chip>
        {cinemas.map((c) => (
          <Chip key={c.id} active={selected?.id === c.id} onClick={() => select(c.id)}>
            {c.name.replace(/^KursiKu\s+/, '')} · {c.city}
          </Chip>
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-xs text-faint">
          {selected.name} · {selected.address}
        </p>
      )}
    </div>
  )
}