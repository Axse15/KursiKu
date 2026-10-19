import { useState } from "react";
import { Link } from "react-router-dom";
import { RANK_DAYS, useRanking } from "../lib/useRanking";
import PageHead from "../components/PageHead";
import {
  Empty,
  ErrorBox,
  Poster,
  SectionTitle,
  Skeleton,
  btnGhost,
} from "../components/ui";

// Pengunjung hanya melihat hasilnya (rekomendasi dan peringkat). Cara menilainya ada di lib/spk.js dan lib/useRanking.js.
const SHOW_FIRST = 10;

function Row({ row }) {
  const m = row.movie;
  const sold = row.values.tickets;
  return (
    <li className="nb-flat flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <span
        className={`tnum grid size-9 shrink-0 place-items-center rounded-lg border-2 border-edge text-base font-extrabold ${
          row.rank === 1 ? "bg-tile-yellow" : "bg-panel"
        }`}
        aria-label={`Peringkat ${row.rank}`}
      >
        {row.rank}
      </span>
      <Link
        to={`/film/${m.id}`}
        className="hidden shrink-0 sm:block"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Poster
          movie={m}
          showMeta={false}
          compact
          className="aspect-[2/3] w-12 rounded-lg"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <Link
            to={`/film/${m.id}`}
            className="min-w-0 font-display text-lg font-extrabold leading-tight tracking-tight hover:underline"
          >
            {m.title}
          </Link>
          <span className="tnum shrink-0 text-sm text-muted">
            {sold > 0 ? (
              <>
                <strong className="text-ink">{sold}</strong> tiket terjual
              </>
            ) : (
              "Belum ada penjualan"
            )}
          </span>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full border-2 border-edge bg-panel"
          aria-hidden="true"
        >
          <div
            className={`h-full ${row.rank === 1 ? "bg-accent" : "bg-tile-blue"}`}
            style={{ width: `${Math.max(2, row.score * 100)}%` }}
          />
        </div>
      </div>
    </li>
  );
}

export default function Terlaris() {
  const [all, setAll] = useState(false);
  const { rows, loading, error, reload } = useRanking();

  if (error)
    return (
      <ErrorBox
        message={`Data film terlaris gagal dimuat: ${error}`}
        onRetry={reload}
      />
    );
  if (loading || !rows) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        <PageHead id="terlaris-judul" title="Film terlaris" tone="blue" />
        <Empty title="Belum ada film untuk ditampilkan">
          Film muncul di sini setelah ada jadwal tayang atau penjualan tiket.
        </Empty>
      </div>
    );
  }

  const best = rows[0];
  const totalTickets = rows.reduce((s, r) => s + r.values.tickets, 0);
  const shown = all ? rows : rows.slice(0, SHOW_FIRST);

  return (
    <div className="space-y-8">
      <PageHead
        id="terlaris-judul"
        title="Film terlaris"
        tone="blue"
        sub="Film yang paling banyak dipilih penonton KursiKu belakangan ini."
      />

      {totalTickets === 0 && (
        <p
          role="status"
          className="rounded-xl border-2 border-warn-line bg-warn-bg p-4 text-sm text-ink-2"
        >
          Belum ada tiket terjual dalam {RANK_DAYS} hari terakhir, jadi urutan
          sementara mengikuti rating film.
        </p>
      )}

      <section
        aria-labelledby="rekom-judul"
        className="nb-card flex gap-4 bg-tile-yellow p-5 sm:gap-6 sm:p-6"
      >
        <Poster
          movie={best.movie}
          showMeta={false}
          compact
          className="aspect-[2/3] w-24 shrink-0 self-start rounded-lg shadow-nb sm:w-28"
        />
        <div className="min-w-0 self-center">
          <h2 id="rekom-judul" className="text-sm font-bold text-ink-2">
            Rekomendasi untukmu
          </h2>
          <Link
            to={`/film/${best.movie.id}`}
            className="mt-1 block font-display text-3xl font-extrabold leading-tight tracking-tight hover:underline sm:text-4xl"
          >
            {best.movie.title}
          </Link>
          {best.values.tickets > 0 && (
            <p className="tnum mt-2 text-sm">
              <strong>{best.values.tickets}</strong> tiket terjual dalam{" "}
              {RANK_DAYS} hari terakhir
            </p>
          )}
          <Link
            to={`/film/${best.movie.id}`}
            className="nb-lift mt-4 inline-flex min-h-11 items-center rounded-xl border-2 border-edge bg-ink px-5 text-sm font-bold text-page shadow-nb"
          >
            Lihat jadwal
          </Link>
        </div>
      </section>

      <section aria-labelledby="peringkat-judul">
        <SectionTitle
          id="peringkat-judul"
          sub={`${rows.length} film, diurutkan dari yang paling diminati.`}
        >
          Peringkat film
        </SectionTitle>
        <ol className="space-y-3">
          {shown.map((r) => (
            <Row key={r.movie.id} row={r} />
          ))}
        </ol>
        {rows.length > SHOW_FIRST && (
          <button
            type="button"
            onClick={() => setAll((a) => !a)}
            className={`${btnGhost} mt-4`}
          >
            {all
              ? "Tampilkan 10 teratas saja"
              : `Tampilkan semua ${rows.length} film`}
          </button>
        )}
      </section>
    </div>
  );
}
