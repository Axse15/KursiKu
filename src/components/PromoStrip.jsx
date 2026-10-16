import { Link } from "react-router-dom";
import { usePromos } from "../lib/usePromos";

// Pengingat kecil di beranda: hanya memberi tahu BAHWA ada kode promo hari ini. Kodenya sendiri (dan besar potongannya)
// sengaja tidak ditampilkan di sini, hanya di halaman Promo.
// Tidak tampil kalau hari ini tidak ada kode, semua kode sudah dipakai akun ini, atau fungsi database belum dibuat
// (supabase-v8.sql belum dijalankan).
export default function PromoStrip() {
  const { data } = usePromos();
  if (!data || data.length === 0) return null;
  return (
    <Link
      to="/promo"
      className="flex min-h-14 items-stretch overflow-hidden rounded-xl border border-line bg-panel hover:border-accent"
    >
      <span className="flex w-[4.5rem] shrink-0 items-center justify-center bg-accent/10 font-display text-2xl font-bold text-accent-ink">
        {data.length}
      </span>
      <span className="relative flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-l border-dashed border-line-strong px-3 py-3">
        <span
          aria-hidden="true"
          className="absolute -left-[7px] -top-[7px] h-3.5 w-3.5 rounded-full border border-line-strong bg-page"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-[7px] -left-[7px] h-3.5 w-3.5 rounded-full border border-line-strong bg-page"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">
            {data.length === 1
              ? "Ada 1 kode promo hari ini"
              : `Ada ${data.length} kode promo hari ini`}
          </span>
          <span className="block text-xs text-muted">
            Kode hanya muncul di hari tertentu dan sekali pakai per akun.
          </span>
        </span>
        <span className="text-sm text-accent-ink underline">Lihat kodenya</span>
      </span>
    </Link>
  );
}
