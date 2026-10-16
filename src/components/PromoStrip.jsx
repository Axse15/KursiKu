import { Link } from "react-router-dom";
import { usePromos } from "../lib/usePromos";

// Promo aktif untuk beranda, bentuknya potongan tiket (persen di kiri, garis putus-putus, syarat dan kode di kanan).
// Kalau tabel promo belum dibuat (supabase-v4.sql belum dijalankan) atau gagal dimuat, bagian ini diam-diam tidak tampil.
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
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {data.slice(0, 4).map((p) => (
          <li
            key={p.code}
            className="flex w-72 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-panel sm:w-auto"
          >
            <div className="flex w-[4.5rem] shrink-0 items-center justify-center bg-accent/10 font-display text-2xl font-bold text-accent-ink">
              {p.percent_off}%
            </div>
            <div className="relative min-w-0 flex-1 border-l border-dashed border-line-strong px-3 py-3">
              <span
                aria-hidden="true"
                className="absolute -left-[7px] -top-[7px] h-3.5 w-3.5 rounded-full border border-line-strong bg-page"
              />
              <span
                aria-hidden="true"
                className="absolute -bottom-[7px] -left-[7px] h-3.5 w-3.5 rounded-full border border-line-strong bg-page"
              />
              <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                {p.description}
              </p>
              <p className="mt-2 text-xs text-faint">
                Kode{" "}
                <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-ink">
                  {p.code}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
