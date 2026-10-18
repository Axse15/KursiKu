import { Link } from "react-router-dom";
import { usePromos } from "../lib/usePromos";

// Petak promo di beranda. Hanya memberi tahu BAHWA ada kode promo hari ini; kodenya sendiri (dan besar potongannya)
// sengaja tidak ditampilkan di sini, hanya di halaman Promo.
// Kalau tidak ada kode (hari ini tidak ada, semua sudah dipakai akun ini, atau supabase-v8.sql belum dijalankan),
// petaknya tetap tampil sebagai pintu ke halaman Promo (diskon film harian).
export default function PromoStrip({ className = "" }) {
  const { data } = usePromos();
  const n = data?.length || 0;
  return (
    <Link
      to="/promo"
      className={`group nb-card nb-lift flex flex-col justify-between gap-4 bg-tile-pink p-5 ${className}`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-display text-xl font-extrabold leading-tight tracking-tight">
          {n === 0
            ? "Promo & diskon"
            : n === 1
              ? "Ada 1 kode promo hari ini"
              : `Ada ${n} kode promo hari ini`}
        </span>
        {n > 0 && (
          <span className="tnum grid size-11 shrink-0 place-items-center rounded-xl border-2 border-edge bg-accent text-lg font-extrabold text-on-accent">
            {n}
          </span>
        )}
      </span>
      <span className="text-sm text-ink-2">
        {n === 0
          ? "Diskon film berganti setiap hari. Kode promo muncul di hari tertentu dan sekali pakai per akun."
          : "Kode hanya muncul di hari tertentu dan sekali pakai per akun."}
      </span>
      <span className="text-sm font-bold group-hover:underline">
        {n === 0 ? "Lihat promo" : "Lihat kodenya"}{" "}
        <span aria-hidden="true">›</span>
      </span>
    </Link>
  );
}
