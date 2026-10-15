import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useCinema } from "../lib/cinema";
import { fmtWhen } from "../lib/config";
import CinemaPicker from "../components/CinemaPicker";
import {
  Backdrop,
  Empty,
  ErrorBox,
  Poster,
  Skeleton,
  Texture,
  btnPrimary,
} from "../components/ui";

// "Sedang tayang" = film yang punya jadwal dalam 3 hari ke depan.
// Dibatasi 3 hari supaya jumlah barisnya kecil (batas bawaan Supabase 1000 baris per permintaan).
const WINDOW_MS = 3 * 86400000;

function Hero({ movie, when }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl p-6 sm:p-10"
      style={{
        background: `linear-gradient(120deg, ${movie.poster_from}, ${movie.poster_to})`,
      }}
    >
      <Texture />
      <Backdrop src={movie.backdrop_url} />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent"
      />
      <div className="relative flex items-center justify-between gap-8">
        <div className="max-w-xl">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-300">
            Pilihan hari ini
          </p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
            {movie.title}
          </h2>
          <p className="mt-2 text-sm text-white/80">
            {movie.genre} · {movie.duration_min} menit
          </p>
          <p className="mt-4 line-clamp-3 text-white/85">{movie.synopsis}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to={`/film/${movie.id}`} className={btnPrimary}>
              Lihat jadwal
            </Link>
            {when && (
              <span className="text-sm text-white/80">
                Tayang berikutnya: {when}
              </span>
            )}
          </div>
        </div>
        <Poster
          movie={movie}
          showMeta={false}
          className="hidden aspect-[2/3] w-44 shrink-0 rotate-3 shadow-2xl shadow-black/50 md:block"
        />
      </div>
    </section>
  );
}

export default function Home() {
  const [genre, setGenre] = useState("Semua");
  const [query, setQuery] = useState("");
  const {
    cinemas,
    selected,
    select,
    error: cinemaError,
    reload: reloadCinemas,
  } = useCinema();
  const cinemaId = selected?.id ?? null;

  const { data, loading, error, reload } = useAsync(async () => {
    const movies = unwrap(
      await supabase.from("movies").select("*").order("id"),
    );

    const now = Date.now();
    let q = supabase
      .from("showtimes")
      .select("movie_id, cinema_id, starts_at")
      .gte("starts_at", new Date(now).toISOString())
      .lt("starts_at", new Date(now + WINDOW_MS).toISOString())
      .order("starts_at")
      .limit(1000);
    if (cinemaId) q = q.eq("cinema_id", cinemaId);
    const shows = unwrap(await q);

    // jadwal terdekat per film + berapa bioskop yang menayangkannya
    const next = {};
    const where = {};
    for (const s of shows) {
      if (!next[s.movie_id]) next[s.movie_id] = s.starts_at;
      (where[s.movie_id] ||= new Set()).add(s.cinema_id);
    }
    return { movies, next, where };
  }, [cinemaId]);

  if (cinemaError) {
    return (
      <ErrorBox
        message={`Data bioskop gagal dimuat: ${cinemaError}. Pastikan file supabase-cinema-auth.sql sudah dijalankan di Supabase.`}
        onRetry={reloadCinemas}
      />
    );
  }
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  if (loading && !data) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-64 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  const { movies, next, where } = data;
  if (movies.length === 0) {
    return (
      <Empty title="Belum ada film">
        Isi data lewat <code>supabase.sql</code> atau <code>import.sql</code>.
      </Empty>
    );
  }

  const nowShowing = movies.filter((m) => next[m.id]);
  const featured = [...nowShowing].sort(
    (a, b) => new Date(next[a.id]) - new Date(next[b.id]),
  )[0];

  const genres = ["Semua", ...new Set(nowShowing.map((m) => m.genre))];
  const activeGenre = genres.includes(genre) ? genre : "Semua"; // genre bisa hilang saat ganti bioskop
  const q = query.trim().toLowerCase();
  const shown = nowShowing.filter(
    (m) =>
      (activeGenre === "Semua" || m.genre === activeGenre) &&
      (!q || m.title.toLowerCase().includes(q)),
  );

  const place = selected
    ? `${selected.name}, ${selected.city}`
    : `${cinemas.length} bioskop`;

  return (
    <div className="space-y-10">
      {featured && <Hero movie={featured} when={fmtWhen(next[featured.id])} />}

      <section>
        <h1 className="font-display text-3xl font-bold">Sedang tayang</h1>
        <p className="mt-1 text-zinc-400">
          {nowShowing.length} film · {place}
        </p>

        <CinemaPicker className="mt-4" />

        {nowShowing.length === 0 ? (
          <div className="mt-6">
            {selected ? (
              <Empty title={`Belum ada jadwal di ${selected.name}`}>
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="underline"
                >
                  Lihat semua bioskop
                </button>
              </Empty>
            ) : (
              <Empty title="Belum ada jadwal tayang">
                Untuk pembuat web: jalankan{" "}
                <code>select refresh_showtimes(7);</code> di Supabase SQL
                Editor.
              </Empty>
            )}
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <label htmlFor="cari" className="sr-only">
                  Cari film
                </label>
                <input
                  id="cari"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari judul film…"
                  className="min-h-11 w-full min-w-64 rounded-xl border border-zinc-700 bg-zinc-900 px-4 placeholder:text-zinc-500"
                />
              </div>
              <div
                role="group"
                aria-label="Filter genre"
                className="flex flex-wrap gap-2"
              >
                {genres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={activeGenre === g}
                    onClick={() => setGenre(g)}
                    className={`min-h-10 rounded-full border px-4 text-sm ${
                      activeGenre === g
                        ? "border-amber-400 bg-amber-400 font-semibold text-zinc-950"
                        : "border-zinc-700 text-zinc-300 hover:border-amber-400"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="mt-6">
                <Empty title="Tidak ada film yang cocok">
                  Coba kata kunci atau genre lain.
                </Empty>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                {shown.map((m) => (
                  <li key={m.id}>
                    <Link to={`/film/${m.id}`} className="group block">
                      <Poster
                        movie={m}
                        className="aspect-[2/3] shadow-lg shadow-black/40 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-amber-400/10"
                      />
                      <p className="mt-3 line-clamp-1 text-sm font-medium text-zinc-200">
                        {m.title}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {m.duration_min} menit
                        {!selected && ` · ${where[m.id].size} bioskop`}
                      </p>
                      <p className="text-sm font-medium text-amber-300">
                        {fmtWhen(next[m.id])}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
