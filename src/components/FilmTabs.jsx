import { Link } from 'react-router-dom'

// Pilihan "Sedang tayang" / "Coming soon". Berupa tautan ke dua halaman, jadi alamatnya bisa dibagikan.
// active: 'now' | 'soon'
export default function FilmTabs({ active, nowCount = null, soonCount = null, className = '' }) {
  const item = (key, to, label, count) => (
    <Link
      to={to}
      aria-current={active === key ? 'page' : undefined}
      className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 text-sm font-bold transition-colors ${
        active === key ? 'border-edge bg-ink text-page' : 'border-edge bg-panel text-ink hover:bg-raised'
      }`}
    >
      {label}
      {count != null && <span className="tnum text-xs opacity-80">{count}</span>}
    </Link>
  )
  return (
    <nav aria-label="Jenis daftar film" className={`flex flex-wrap gap-2 ${className}`}>
      {item('now', '/sedang-tayang', 'Sedang tayang', nowCount)}
      {item('soon', '/segera-hadir', 'Coming soon', soonCount)}
    </nav>
  )
}
