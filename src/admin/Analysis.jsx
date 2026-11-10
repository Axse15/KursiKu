import { useMemo, useState } from "react";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useFilms } from "../lib/films";
import {
  CRITERIA,
  DEFAULT_WEIGHTS,
  buildAlternatives,
  normalizeWeights,
  saw,
} from "../lib/spk";
import { num } from "../lib/admin";
import {
  Card,
  Empty,
  ErrorBox,
  FilterSelect,
  Page,
  Skeleton,
  Stat,
  TableWrap,
  btnGhost,
  cardFlat,
  td,
  th,
} from "./kit";

const SAME = (a, b) =>
  CRITERIA.every((c) => Number(a[c.key]) === Number(b[c.key]));
const pct = (v) => `${Math.round(v * 100)}%`;

// Selisih peringkat dibanding bobot bawaan: naik (+), turun (-), atau tetap.
function Move({ by }) {
  if (!by) return <span className="text-muted">tetap</span>;
  return (
    <span className={`font-bold ${by > 0 ? "text-ok" : "text-danger"}`}>
      {by > 0 ? `naik ${by}` : `turun ${-by}`}
    </span>
  );
}

// Halaman analisis: memperlihatkan dasar hitungan peringkat di halaman Terlaris (metode SAW, lihat src/lib/spk.js).
// Datanya dan rumusnya sama persis dengan yang dipakai halaman pembeli. Bobot di sini hanya untuk mencoba (tidak disimpan).
export default function Analysis() {
  const [days, setDays] = useState("30");
  const [weights, setWeights] = useState({ ...DEFAULT_WEIGHTS });
  const films = useFilms(null);
  const sales = useAsync(
    async () =>
      unwrap(await supabase.rpc("movie_sales", { p_days: Number(days) })) || [],
    [days],
  );

  const error = films.error || sales.error || "";
  const loading =
    (films.loading && !films.data) || (sales.loading && !sales.data);

  const calc = useMemo(() => {
    if (!films.data || !sales.data) return null;
    const alts = buildAlternatives(
      films.movies,
      sales.data,
      films.nowShowing.map((m) => m.id),
    );
    const mine = saw(alts, weights);
    const base = saw(alts, DEFAULT_WEIGHTS);
    const baseRank = new Map(base.rows.map((r) => [r.movie.id, r.rank]));
    return { mine, baseRank, n: alts.length };
  }, [films.data, films.movies, films.nowShowing, sales.data, weights]);

  const isDefault = SAME(weights, DEFAULT_WEIGHTS);
  const { weights: share, equalFallback } = normalizeWeights(weights);

  function reload() {
    films.reload();
    sales.reload();
  }

  return (
    <Page
      id="analisis"
      title="Analisis film"
      sub="Dasar hitungan peringkat di halaman Terlaris: nilai tiap film, bobot tiap kriteria, dan skor akhirnya. Ubah bobot untuk mencoba. Hasilnya tidak mengubah halaman Terlaris."
      actions={
        <FilterSelect
          id="analisis-hari"
          label="Periode"
          value={days}
          onChange={setDays}
        >
          <option value="7">7 hari terakhir</option>
          <option value="30">30 hari terakhir</option>
          <option value="90">90 hari terakhir</option>
        </FilterSelect>
      }
    >
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      )}

      {calc && calc.n === 0 && (
        <Empty title="Belum ada film untuk dinilai">
          Film masuk penilaian setelah punya jadwal tayang atau penjualan tiket.
        </Empty>
      )}

      {calc && calc.n > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <Stat
              label="Peringkat 1"
              icon="chart"
              tone="yellow"
              value={calc.mine.rows[0].movie.title}
              sub={`Skor ${pct(calc.mine.rows[0].score)}`}
              className="col-span-2 lg:col-span-1"
            />
            <Stat
              label="Tiket terjual"
              icon="ticket"
              tone="green"
              value={num(
                calc.mine.rows.reduce((s, r) => s + r.values.tickets, 0),
              )}
              sub={`${days} hari terakhir`}
            />
            <Stat
              label="Film dinilai"
              icon="film"
              tone="blue"
              value={num(calc.n)}
              sub="Sedang tayang atau ada penjualan"
            />
          </div>

          <Card
            title="Bobot penilaian"
            sub="Makin besar bobot, makin berpengaruh kriteria itu pada skor. Totalnya otomatis dibuat 100%."
            aside={
              <button
                type="button"
                onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}
                disabled={isDefault}
                className={`${btnGhost} min-h-10 text-xs`}
              >
                Kembalikan bobot bawaan
              </button>
            }
          >
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {CRITERIA.map((c) => (
                <div key={c.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor={`bobot-${c.key}`}
                      className="text-sm font-bold"
                    >
                      {c.label}
                    </label>
                    <span className="text-sm font-extrabold">
                      {pct(share[c.key])}
                    </span>
                  </div>
                  <input
                    id={`bobot-${c.key}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={weights[c.key]}
                    onChange={(e) =>
                      setWeights((w) => ({
                        ...w,
                        [c.key]: Number(e.target.value),
                      }))
                    }
                    aria-describedby={`bobot-${c.key}-hint`}
                    className="mt-2 h-6 w-full cursor-pointer accent-accent"
                  />
                  <p id={`bobot-${c.key}-hint`} className="text-xs text-muted">
                    {c.hint}
                  </p>
                </div>
              ))}
            </div>
            <p
              role="status"
              className={`${cardFlat} mt-5 bg-raised/40 p-3 text-xs ${isDefault ? "text-muted" : "text-ink"}`}
            >
              {equalFallback
                ? "Semua bobot 0, jadi keempat kriteria dihitung sama rata."
                : isDefault
                  ? "Memakai bobot bawaan: sama dengan yang dipakai halaman Terlaris."
                  : 'Bobot sedang diubah (simulasi). Halaman Terlaris tetap memakai bobot bawaan. Kolom "Dibanding bawaan" menunjukkan perubahan peringkat.'}
            </p>
          </Card>

          <section aria-labelledby="peringkat-analisis">
            <h2
              id="peringkat-analisis"
              className="mb-3 text-lg font-extrabold tracking-tight"
            >
              Peringkat
            </h2>
            <TableWrap label="Peringkat film">
              <table className="w-full min-w-[46rem]">
                <thead>
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Film</th>
                    <th className={th}>Tiket</th>
                    <th className={th}>Pesanan</th>
                    <th className={th}>Tren 7 hari</th>
                    <th className={th}>Rating</th>
                    <th className={th}>Skor</th>
                    {!isDefault && <th className={th}>Dibanding bawaan</th>}
                  </tr>
                </thead>
                <tbody>
                  {calc.mine.rows.map((r) => (
                    <tr key={r.movie.id}>
                      <td className={`${td} font-extrabold`}>{r.rank}</td>
                      <td className={`${td} font-bold`}>{r.movie.title}</td>
                      <td className={td}>{num(r.values.tickets)}</td>
                      <td className={td}>{num(r.values.orders)}</td>
                      <td className={td}>{num(r.values.recent)}</td>
                      <td className={td}>
                        {r.values.rating > 0 ? r.values.rating.toFixed(1) : "-"}
                      </td>
                      <td className={td}>
                        <div className="flex min-w-[7rem] items-center gap-2">
                          <div
                            className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-line-strong bg-raised"
                            aria-hidden="true"
                          >
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{
                                width: `${Math.max(2, r.score * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 shrink-0 text-right font-bold">
                            {pct(r.score)}
                          </span>
                        </div>
                      </td>
                      {!isDefault && (
                        <td className={`${td} whitespace-nowrap`}>
                          <Move by={calc.baseRank.get(r.movie.id) - r.rank} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {calc.mine.rows.every((r) => r.values.tickets === 0) && (
              <p role="status" className="mt-3 text-sm text-muted">
                Belum ada tiket terjual pada periode ini, jadi urutannya
                mengikuti rating film.
              </p>
            )}
          </section>

          <details className={`${cardFlat} p-4 text-sm sm:p-5`}>
            <summary className="cursor-pointer font-bold">
              Lihat langkah perhitungan (metode SAW)
            </summary>
            <div className="mt-4 space-y-4">
              <ol className="list-decimal space-y-1.5 pl-5 text-ink-2">
                <li>
                  Setiap film punya nilai untuk empat kriteria (tabel peringkat
                  di atas).
                </li>
                <li>
                  Nilai dinormalisasi: nilai film dibagi nilai terbesar di
                  kriteria itu, jadi hasilnya 0 sampai 1. Film terbaik di satu
                  kriteria mendapat 1.
                </li>
                <li>
                  Setiap kriteria punya bobot. Bobot dijumlahkan menjadi 100%.
                </li>
                <li>
                  Skor akhir = jumlah dari (bobot × nilai normalisasi). Skor
                  tertinggi jadi peringkat 1.
                </li>
              </ol>
              <TableWrap label="Nilai normalisasi dan skor">
                <table className="w-full min-w-[40rem]">
                  <thead>
                    <tr>
                      <th className={th}>Film</th>
                      {CRITERIA.map((c) => (
                        <th key={c.key} className={th}>
                          {c.label}{" "}
                          <span className="font-normal">
                            (bobot {pct(share[c.key])})
                          </span>
                        </th>
                      ))}
                      <th className={th}>Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`${td} text-muted`}>Nilai terbesar</td>
                      {CRITERIA.map((c) => (
                        <td key={c.key} className={`${td} text-muted`}>
                          {c.key === "rating"
                            ? calc.mine.max[c.key].toFixed(1)
                            : num(calc.mine.max[c.key])}
                        </td>
                      ))}
                      <td className={td} />
                    </tr>
                    {calc.mine.rows.map((r) => (
                      <tr key={r.movie.id}>
                        <td className={`${td} font-bold`}>{r.movie.title}</td>
                        {CRITERIA.map((c) => (
                          <td key={c.key} className={td}>
                            {r.norm[c.key].toFixed(2)}
                          </td>
                        ))}
                        <td className={`${td} font-bold`}>
                          {r.score.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </details>
        </div>
      )}
    </Page>
  );
}
