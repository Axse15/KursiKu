import { useState } from "react";
import { Link } from "react-router-dom";
import { useFilms } from "../lib/films";
import { ageOf } from "../lib/age";
import { fmtReleaseLong, fmtReleaseShort, untilLabel } from "../lib/release";
import FilmTabs from "../components/FilmTabs";
import MovieCard from "../components/MovieCard";
import PageHead from "../components/PageHead";
import {
  Backdrop,
  Empty,
  ErrorBox,
  Skeleton,
  fieldCls,
} from "../components/ui";
import { GRID } from "./NowShowing";

const SORTS = { rilis: "Rilis terdekat", populer: "Paling dinantikan" };

// Film yang belum rilis. Belum bisa dipesan: jadwal dan tiket dibuka saat film rilis.
export default function ComingSoon() {
  const [genre, setGenre] = useState("Semua");
  const [sort, setSort] = useState("rilis");
  const { data, loading, error, reload, info, upcoming, nowShowing } =
    useFilms(null);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <div className={GRID}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  const counts = {};
  for (const m of upcoming) counts[m.genre] = (counts[m.genre] || 0) + 1;
  const genres = Object.keys(counts).sort();
  const activeGenre = genres.includes(genre) ? genre : "Semua";
  const shown = upcoming
    .filter((m) => activeGenre === "Semua" || m.genre === activeGenre)
    .sort(
      sort === "populer"
        ? (a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0)
        : (a, b) => info[a.id].days - info[b.id].days || b.id - a.id,
    );
  const first = upcoming[0]; // yang paling dekat rilisnya
  const field = `mt-1 ${fieldCls}`;

  return (
    <div className="space-y-8">
      <PageHead
        id="segera-judul"
        title="Coming soon"
        tone="lilac"
        sub="Film yang belum rilis. Belum bisa dipesan: jadwal dan tiket dibuka saat film rilis."
      >
        <FilmTabs
          active="soon"
          nowCount={nowShowing.length}
          soonCount={upcoming.length}
          className="mt-5"
        />
      </PageHead>

      {upcoming.length === 0 ? (
        <Empty title="Belum ada film yang akan datang">
          Untuk pembuat web: jalankan <code>node scripts/import-tmdb.mjs</code>{" "}
          lalu tempel import.sql di Supabase.
        </Empty>
      ) : (
        <>
          {/* petak besar: film yang paling dekat rilisnya */}
          {first && (
            <Link
              to={`/film/${first.id}`}
              className="on-photo nb-card nb-lift relative block overflow-hidden bg-[#13111f] p-6 text-white sm:p-8"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(120deg, ${first.poster_from}, ${first.poster_to})`,
                }}
              />
              <Backdrop src={first.backdrop_url} />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30"
              />
              <div className="relative max-w-xl">
                <p className="inline-block rounded-lg border-2 border-edge bg-[#ffe27a] px-2 py-0.5 text-xs font-bold text-[#14122b]">
                  Rilis berikutnya
                </p>
                <p className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                  {first.title}
                </p>
                <p className="mt-3 text-lg font-bold">
                  {untilLabel(info[first.id].days)}{" "}
                  <span className="font-normal text-white/85">
                    · {fmtReleaseLong(info[first.id].date)}
                  </span>
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-white/90">
                  {first.synopsis}
                </p>
              </div>
            </Link>
          )}

          <section aria-labelledby="daftar-soon">
            <h2 id="daftar-soon" className="sr-only">
              Daftar film coming soon
            </h2>
            <div className="nb-flat grid grid-cols-2 gap-3 p-4">
              <div>
                <label
                  htmlFor="kategori"
                  className="text-xs font-bold text-muted"
                >
                  Kategori
                </label>
                <select
                  id="kategori"
                  value={activeGenre}
                  onChange={(e) => setGenre(e.target.value)}
                  className={field}
                >
                  <option value="Semua">
                    Semua kategori ({upcoming.length})
                  </option>
                  {genres.map((g) => (
                    <option key={g} value={g}>
                      {g} ({counts[g]})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="urut" className="text-xs font-bold text-muted">
                  Urutkan
                </label>
                <select
                  id="urut"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className={field}
                >
                  {Object.entries(SORTS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ul className={`mt-6 ${GRID}`}>
              {shown.map((m) => (
                <li key={m.id}>
                  <MovieCard
                    movie={m}
                    tag="soon"
                    left={`Rilis ${fmtReleaseShort(info[m.id].date)}`}
                    right={untilLabel(info[m.id].days)}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              {upcoming.filter((m) => ageOf(m)).length > 0 &&
                "Penanda usia adalah perkiraan, bukan klasifikasi resmi LSF. "}
              Tanggal rilis mengikuti data TMDB untuk Indonesia.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
