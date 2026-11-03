import { Link } from 'react-router-dom'
import { usePromos } from '../lib/usePromos'

// Petak promo di beranda. Hanya memberi tahu BAHWA ada kode promo hari ini; kodenya sendiri (dan besar potongannya)
// sengaja tidak ditampilkan di sini, hanya di halaman Promo.
// Kalau tidak ada kode (hari ini tidak ada, semua sudah dipakai akun ini, atau supabase-v8.sql belum dijalankan),
// petaknya tetap tampil sebagai pintu ke halaman Promo (diskon film harian).
export default function PromoStrip({ className = '' }) {
  const { data } = usePromos()
  const n = data?.length || 0
  return (
    <Link to="/promo" className={`group nb-card nb-lift flex items-center justify-between gap-3 bg-tile-pink p-4 ${className}`}>
      <span className="min-w-0">
        <span className="block font-display text-lg font-extrabold leading-tight tracking-tight">
          {n === 0 ? 'Promo & diskon' : n === 1 ? 'Ada 1 kode promo hari ini' : `Ada ${n} kode promo hari ini`}
        </span>
        <span className="mt-0.5 block text-xs text-ink-2">
          {n === 0 ? 'Diskon film berganti tiap hari.' : 'Sekali pakai per akun, hanya hari tertentu.'}
        </span>
      </span>
      {n > 0 ? (
        <span className="tnum grid size-10 shrink-0 place-items-center rounded-xl border-2 border-edge bg-accent text-lg font-extrabold text-on-accent">
          {n}
        </span>
      ) : (
        <span aria-hidden="true" className="shrink-0 text-xl font-bold group-hover:translate-x-0.5">
          ›
        </span>
      )}
    </Link>
  )
}
