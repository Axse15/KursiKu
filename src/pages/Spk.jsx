import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useFilms } from "../lib/films";
import {
  CRITERIA,
  DEFAULT_WEIGHTS,
  buildAlternatives,
  saw,
  topByTickets,
} from "../lib/spk";
import PageHead from "../components/PageHead";
import {
  Empty,
  ErrorBox,
  Poster,
  SectionTitle,
  Skeleton,
  btnGhost,
} from "../components/ui";

const PERIODS = [
  [7, "7 hari"],
  [30, "30 hari"],
  [90, "90 hari"],
  [0, "Semua waktu"],
];
const SHOW_FIRST = 10;

const pct = (n) => `${(n * 100).toFixed(1)}`;
const fmtVal = (key, v) =>
  key === "rating" ? (v > 0 ? v.toFixed(1) : "-") : String(v);

// Alasan singkat kenapa sebuah film unggul: kriteria dengan sumbangan skor terbesar.
function strengths(row, weights) {
  return CRITERIA.filter((c) => row.norm[c.key] >= 0.8 && weights[c.key] > 0)
    .sort(
      (a, b) =>
        weights[b.key] * row.norm[b.key] - weights[a.key] * row.norm[a.key],
    )
    .slice(0, 2)
    .map((c) => c.label.toLowerCase());
}

function ScoreRow({ row }) {
  const m = row.movie;
  const v = row.values;
  return (
    <li className="nb-flat flex gap-3 p-3 sm:gap-4 sm:p-4">
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
          <span className="tnum shrink-0 text-sm font-bold">
            Skor {pct(row.score)}
          </span>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full border-2 border-edge bg-panel"
          role="img"
          aria-label={`Skor ${pct(row.score)} dari 100`}
        >
          <div
            className={`h-full ${row.rank === 1 ? "bg-accent" : "bg-tile-blue"}`}
            style={{ width: `${Math.max(2, row.score * 100)}%` }}
          />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted sm:grid-cols-4">
          <div className="flex justify-between gap-2 sm:block">
            <dt className="inline sm:block">Tiket</dt>{" "}
            <dd className="tnum inline font-bold text-ink sm:block">
              {v.tickets}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="inline sm:block">Pesanan</dt>{" "}
            <dd className="tnum inline font-bold text-ink sm:block">
              {v.orders}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="inline sm:block">7 hari</dt>{" "}
            <dd className="tnum inline font-bold text-ink sm:block">
              {v.recent}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="inline sm:block">Rating</dt>{" "}
            <dd className="tnum inline font-bold text-ink sm:block">
              {fmtVal("rating", v.rating)}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}

export default function Spk() {
  const [days, setDays] = useState(30);
  const [raw, setRaw] = useState(DEFAULT_WEIGHTS);
  const [all, setAll] = useState(false);

  const films = useFilms(null);
  const {
    data: sales,
    loading,
    error,
    reload,
  } = useAsync(
    async () =>
      unwrap(await supabase.rpc("movie_sales", { p_days: days })) || [],
    [days],
  );

  if (films.error)
    return <ErrorBox message={films.error} onRetry={films.reload} />;
  if (error) {
    return (
      <ErrorBox
        message={`Data penjualan gagal dimuat: ${error}`}
        onRetry={reload}
      />
    );
  }
  if ((films.loading && !films.data) || (loading && !sales)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const alts = buildAlternatives(
    films.movies,
    sales,
    films.nowShowing.map((m) => m.id),
  );
  const { rows, max, weights, equalFallback } = saw(alts, raw);
  const best = rows[0];
  const bestSold = topByTickets(rows);
  const totalTickets = rows.reduce((s, r) => s + r.values.tickets, 0);
  const totalOrders = rows.reduce((s, r) => s + r.values.orders, 0);
  const periodLabel = PERIODS.find(([d]) => d === days)?.[1] || "";
  const shown = all ? rows : rows.slice(0, SHOW_FIRST);
  const setWeight = (key) => (e) =>
    setRaw((w) => ({ ...w, [key]: Number(e.target.value) }));
  const isDefault = CRITERIA.every(
    (c) => raw[c.key] === DEFAULT_WEIGHTS[c.key],
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        <PageHead id="spk-judul" title="SPK film terlaris" tone="blue" />
        <Empty title="Belum ada film untuk dibandingkan">
          Film muncul di sini setelah ada jadwal tayang atau penjualan tiket.
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHead
        id="spk-judul"
        title="SPK film terlaris"
        tone="blue"
        sub="Sistem Penunjang Keputusan dengan metode SAW. Tiket terjual, jumlah pesanan, tren 7 hari, dan rating digabung jadi satu skor, lalu film diurutkan dari yang paling layak diutamakan."
      />

      {totalTickets === 0 && (
        <p
          role="status"
          className="rounded-xl border-2 border-warn-line bg-warn-bg p-4 text-sm text-ink-2"
        >
          <strong className="text-warn">
            Belum ada penjualan dalam periode ini.
          </strong>{" "}
          Skor penjualan semua film 0, jadi peringkat di bawah hanya ditentukan
          rating dan akan berubah begitu ada yang membeli tiket. Untuk pembuat
          web: jalankan <code>supabase-v10-demo.sql</code> kalau butuh data
          contoh saat presentasi.
        </p>
      )}

      {/* hasil: rekomendasi SPK, tiket terbanyak, total */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <section
          aria-labelledby="rekom-judul"
          className="nb-card flex gap-4 bg-tile-yellow p-5 md:col-span-2 lg:col-span-1"
        >
          <Poster
            movie={best.movie}
            showMeta={false}
            compact
            className="aspect-[2/3] w-20 shrink-0 self-start rounded-lg shadow-nb"
          />
          <div className="min-w-0">
            <h2 id="rekom-judul" className="text-sm font-bold text-ink-2">
              Rekomendasi SPK
            </h2>
            <Link
              to={`/film/${best.movie.id}`}
              className="mt-1 block font-display text-2xl font-extrabold leading-tight tracking-tight hover:underline"
            >
              {best.movie.title}
            </Link>
            <p className="tnum mt-1 text-sm font-bold">
              Skor {pct(best.score)} dari 100
            </p>
            {strengths(best, weights).length > 0 && (
              <p className="mt-1 text-xs text-ink-2">
                Unggul di {strengths(best, weights).join(" dan ")}.
              </p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="terbanyak-judul"
          className="nb-card bg-tile-green p-5"
        >
          <h2 id="terbanyak-judul" className="text-sm font-bold text-ink-2">
            Tiket terbanyak ({periodLabel.toLowerCase()})
          </h2>
          {bestSold ? (
            <>
              <Link
                to={`/film/${bestSold.movie.id}`}
                className="mt-1 block font-display text-2xl font-extrabold leading-tight tracking-tight hover:underline"
              >
                {bestSold.movie.title}
              </Link>
              <p className="tnum mt-1 text-sm">
                <strong>{bestSold.values.tickets}</strong> kursi dalam{" "}
                <strong>{bestSold.values.orders}</strong> pesanan
              </p>
              {bestSold.movie.id !== best.movie.id && (
                <p className="mt-1 text-xs text-ink-2">
                  Beda dengan rekomendasi SPK karena skor SPK juga menimbang
                  tren dan rating.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-2">Belum ada kursi terjual.</p>
          )}
        </section>

        <section
          aria-labelledby="total-judul"
          className="nb-card bg-tile-pink p-5"
        >
          <h2 id="total-judul" className="text-sm font-bold text-ink-2">
            Total penjualan ({periodLabel.toLowerCase()})
          </h2>
          <p className="tnum mt-1 font-display text-4xl font-extrabold leading-none">
            {totalTickets}
          </p>
          <p className="mt-1 text-sm">
            kursi dalam <strong className="tnum">{totalOrders}</strong> pesanan,
            di {rows.filter((r) => r.values.tickets > 0).length} film
          </p>
        </section>
      </div>

      {/* pengaturan: periode + bobot */}
      <section aria-labelledby="atur-judul" className="nb-card p-5 sm:p-6">
        <h2
          id="atur-judul"
          className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
        >
          Atur perhitungan
        </h2>

        <div
          role="group"
          aria-label="Periode penjualan"
          className="mt-4 flex flex-wrap gap-2"
        >
          {PERIODS.map(([d, label]) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`flex min-h-11 items-center rounded-xl border-2 border-edge px-4 text-sm font-bold transition-colors ${
                days === d
                  ? "bg-ink text-page"
                  : "bg-panel text-ink hover:bg-raised"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Periode menentukan kriteria tiket terjual dan jumlah pesanan. Tren
          selalu 7 hari terakhir.
        </p>

        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {CRITERIA.map((c) => (
            <div key={c.key}>
              <label
                htmlFor={`w-${c.key}`}
                className="flex items-baseline justify-between gap-3 text-sm font-semibold text-ink-2"
              >
                <span>{c.label}</span>
                <span className="tnum font-bold text-ink">
                  {Math.round(weights[c.key] * 100)}%
                </span>
              </label>
              <input
                id={`w-${c.key}`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={raw[c.key]}
                onChange={setWeight(c.key)}
                aria-describedby={`w-${c.key}-hint`}
                className="mt-1 h-7 w-full cursor-pointer accent-[var(--color-accent-ink)]"
              />
              <p id={`w-${c.key}-hint`} className="text-xs text-faint">
                {c.hint}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRaw(DEFAULT_WEIGHTS)}
            disabled={isDefault}
            className={btnGhost}
          >
            Kembalikan bobot awal
          </button>
          <p className="text-xs text-muted">
            Geser bobot sesukamu; totalnya otomatis dihitung ulang jadi 100%.
            {equalFallback && " Semua bobot 0, jadi dipakai bobot sama rata."}
          </p>
        </div>
      </section>

      {/* peringkat */}
      <section aria-labelledby="peringkat-judul">
        <SectionTitle
          id="peringkat-judul"
          sub={`${rows.length} film dibandingkan. Skor 100 berarti unggul di semua kriteria.`}
        >
          Peringkat film
        </SectionTitle>
        <ol className="space-y-3">
          {shown.map((r) => (
            <ScoreRow key={r.movie.id} row={r} />
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

      {/* penjelasan langkah SAW dengan angka sungguhan */}
      <section aria-labelledby="cara-judul">
        <details className="nb-card group p-5 sm:p-6">
          <summary
            id="cara-judul"
            className="cursor-pointer font-display text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            Cara menghitung (langkah SAW)
          </summary>

          <div className="mt-4 space-y-5 text-sm text-ink-2">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Matriks keputusan.</strong> Setiap film diberi nilai
                untuk empat kriteria (tabel pertama).
              </li>
              <li>
                <strong>Normalisasi.</strong> Semua kriteria bersifat{" "}
                <em>benefit</em> (makin besar makin baik), jadi{" "}
                <code>r = nilai film / nilai terbesar di kriteria itu</code>.
                Hasilnya 0 sampai 1 (tabel kedua).
              </li>
              <li>
                <strong>Bobot.</strong> Bobot di atas dijumlahkan jadi 100%,
                lalu dikalikan ke tiap nilai ternormalisasi.
              </li>
              <li>
                <strong>Skor akhir.</strong>{" "}
                <code>V = (w1 × r1) + (w2 × r2) + (w3 × r3) + (w4 × r4)</code>.
                Film dengan V terbesar menjadi peringkat 1.
              </li>
            </ol>

            <div>
              <h3 className="mb-2 font-display text-base font-extrabold text-ink">
                Tabel 1: matriks keputusan (X)
              </h3>
              <div className="overflow-x-auto rounded-xl border-2 border-edge">
                <table className="w-full min-w-[34rem] text-left text-xs">
                  <thead className="bg-raised">
                    <tr>
                      <th scope="col" className="p-2">
                        Film
                      </th>
                      {CRITERIA.map((c) => (
                        <th key={c.key} scope="col" className="p-2 text-right">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.movie.id} className="border-t border-line">
                        <th
                          scope="row"
                          className="max-w-48 truncate p-2 font-semibold"
                        >
                          {r.movie.title}
                        </th>
                        {CRITERIA.map((c) => (
                          <td key={c.key} className="tnum p-2 text-right">
                            {fmtVal(c.key, r.values[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-edge bg-raised font-bold">
                      <th scope="row" className="p-2">
                        Terbesar
                      </th>
                      {CRITERIA.map((c) => (
                        <td key={c.key} className="tnum p-2 text-right">
                          {fmtVal(c.key, max[c.key])}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-display text-base font-extrabold text-ink">
                Tabel 2: normalisasi (R) dan skor (V)
              </h3>
              <div className="overflow-x-auto rounded-xl border-2 border-edge">
                <table className="w-full min-w-[38rem] text-left text-xs">
                  <thead className="bg-raised">
                    <tr>
                      <th scope="col" className="p-2">
                        Film
                      </th>
                      {CRITERIA.map((c) => (
                        <th key={c.key} scope="col" className="p-2 text-right">
                          {c.label}
                          <span className="block font-normal text-muted">
                            bobot {Math.round(weights[c.key] * 100)}%
                          </span>
                        </th>
                      ))}
                      <th scope="col" className="p-2 text-right">
                        Skor V
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.movie.id} className="border-t border-line">
                        <th
                          scope="row"
                          className="max-w-48 truncate p-2 font-semibold"
                        >
                          {r.rank}. {r.movie.title}
                        </th>
                        {CRITERIA.map((c) => (
                          <td key={c.key} className="tnum p-2 text-right">
                            {r.norm[c.key].toFixed(3)}
                          </td>
                        ))}
                        <td className="tnum p-2 text-right font-bold">
                          {r.score.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="rounded-xl border-2 border-edge bg-panel p-3 text-xs">
              <strong>Catatan jujur.</strong> SAW hanya menjumlahkan nilai yang
              sudah diskalakan, jadi hasilnya sepenuhnya bergantung pada bobot
              yang kamu pilih. Angka tiket berasal dari pesanan di database
              KursiKu (simulasi, jumlahnya kecil), sedangkan rating dari
              TMDB/IMDb. Film yang baru tayang belum sempat terjual banyak, jadi
              bisa kalah dari film lama walau sedang naik daun. Gunakan
              peringkat ini sebagai bahan pertimbangan, bukan keputusan mutlak.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
