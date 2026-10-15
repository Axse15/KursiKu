import { useState } from "react";
import { Link } from "react-router-dom";
import { fmtWhen } from "../lib/config";
import { Backdrop, Poster, Texture, btnPrimary } from "./ui";

// Banner beranda: tiga daftar (rekomendasi, terpopuler, rating bagus), masing-masing 3 film teratas.
// Tanpa putar otomatis: pengguna memilih sendiri, jadi tidak ada yang bergeser saat sedang dibaca.
export default function Banner({ tabs, next }) {
  const [tabKey, setTabKey] = useState(tabs[0].key);
  const [pick, setPick] = useState(0);
  const tab = tabs.find((t) => t.key === tabKey) || tabs[0];
  const movie = tab.list[Math.min(pick, tab.list.length - 1)];
  if (!movie) return null;

  const imdb = movie.imdb_rating ? Number(movie.imdb_rating).toFixed(1) : null;
  const tmdb = movie.vote_average
    ? Number(movie.vote_average).toFixed(1)
    : null;

  return (
    <section aria-label="Film pilihan">
      <div
        role="tablist"
        aria-label="Jenis pilihan"
        className="mb-3 flex flex-wrap gap-2"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            id={`tab-${t.key}`}
            aria-selected={t.key === tab.key}
            aria-controls="banner-panel"
            onClick={() => {
              setTabKey(t.key);
              setPick(0);
            }}
            className={`min-h-11 rounded-full border px-3 text-sm sm:px-4 ${
              t.key === tab.key
                ? "border-accent bg-accent font-semibold text-on-accent"
                : "border-line-strong text-ink-2 hover:border-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id="banner-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab.key}`}
        className="relative overflow-hidden rounded-3xl p-5 sm:p-10"
        style={{
          background: `linear-gradient(120deg, ${movie.poster_from}, ${movie.poster_to})`,
        }}
      >
        <Texture />
        <Backdrop src={movie.backdrop_url} />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20"
        />
        <div className="relative flex items-center justify-between gap-8">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-300">
              #{pick + 1} {tab.label}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
              {movie.title}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
              <span>
                {movie.genre} · {movie.duration_min} menit
              </span>
              {tmdb && (
                <span className="rounded border border-white/40 px-1.5 text-xs font-semibold">
                  ★ {tmdb} TMDB
                </span>
              )}
              {imdb && (
                <span className="rounded border border-white/40 px-1.5 text-xs font-semibold">
                  IMDb {imdb}
                </span>
              )}
            </p>
            <p className="mt-3 line-clamp-3 text-white/90">{movie.synopsis}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to={`/film/${movie.id}`} className={btnPrimary}>
                Lihat jadwal
              </Link>
              {next[movie.id] && (
                <span className="text-sm text-white/85">
                  Tayang berikutnya: {fmtWhen(next[movie.id])}
                </span>
              )}
            </div>
            <p className="mt-4 text-xs text-white/70">{tab.hint}</p>
          </div>
          <Poster
            movie={movie}
            showMeta={false}
            className="hidden aspect-[2/3] w-44 shrink-0 rotate-3 shadow-2xl shadow-black/50 md:block"
          />
        </div>
      </div>

      <ul
        className="mt-3 grid grid-cols-3 gap-3"
        aria-label={`Daftar ${tab.label}`}
      >
        {tab.list.map((m, i) => (
          <li key={m.id}>
            <button
              type="button"
              aria-pressed={i === pick}
              aria-label={`Tampilkan ${m.title}`}
              onClick={() => setPick(i)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left ${
                i === pick
                  ? "border-accent bg-panel"
                  : "border-line hover:border-line-hover"
              }`}
            >
              <Poster
                movie={m}
                showMeta={false}
                compact
                className="aspect-[2/3] w-9 shrink-0 rounded-md sm:w-12"
              />
              <span className="min-w-0">
                <span className="block text-xs text-faint">#{i + 1}</span>
                <span className="line-clamp-2 text-sm font-medium leading-snug">
                  {m.title}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
