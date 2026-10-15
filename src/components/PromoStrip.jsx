import { Link } from "react-router-dom";
import { usePromos } from "../lib/usePromos";

// Promo aktif untuk beranda. Kalau tabel promo belum dibuat (supabase-v4.sql belum dijalankan) atau gagal dimuat,
// bagian ini diam-diam tidak tampil, supaya beranda tetap jalan.
export default function PromoStrip() {
  const { data } = usePromos();
  if (!data || data.length === 0) return null;
  return (
    <section aria-labelledby="promo-judul">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 id="promo-judul" className="font-display text-xl font-bold">
          Promo hari ini
        </h2>
        <Link to="/promo" className="text-sm text-accent-ink underline">
          Semua promo & harga
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {data.slice(0, 4).map((p) => (
          <li
            key={p.code}
            className="w-64 shrink-0 snap-start rounded-2xl border border-line bg-panel p-4 sm:w-auto"
          >
            <p className="font-display text-2xl font-bold text-accent-ink">
              {p.percent_off}%
            </p>
            <p className="mt-1 font-medium">{p.title}</p>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              {p.description}
            </p>
            <p className="mt-3 text-xs text-faint">
              Kode{" "}
              <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-ink">
                {p.code}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
