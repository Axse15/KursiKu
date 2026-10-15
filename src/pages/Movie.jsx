import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useCinema } from "../lib/cinema";
import { dayKey, fmtDayChip, fmtTime, rupiah, scoreLabel } from "../lib/config";
import CinemaPicker from "../components/CinemaPicker";
import TrailerModal, { isValidYoutubeKey } from "../components/TrailerModal";
import {
  Backdrop,
  Empty,
  ErrorBox,
  Poster,
  Skeleton,
  btnGhost,
} from "../components/ui";

export default function Movie() {
  const { id } = useParams();
  const { selected, select } = useCinema();
  const [day, setDay] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const movie = unwrap(
      await supabase.from("movies").select("*").eq("id", id).maybeSingle(),
    );
    if (!movie) return { movie: null, showtimes: [] };
    // semua jadwal film ini (maks ~60 baris), disaring per bioskop di sisi browser
    const showtimes = unwrap(
      await supabase
        .from("showtimes")
        .select("*, cinemas(name, city)")
        .eq("movie_id", id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(500),
    );
    return { movie, showtimes };
  }, [id]);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </div>
    );
  }
  if (!data.movie) {
    return (
      <Empty title="Film tidak ditemukan">
        <Link to="/" className="underline">
          Kembali ke beranda
        </Link>
      </Empty>
    );
  }

  const { movie, showtimes } = data;
  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;

  // jadwal di bioskop pilihan -> daftar hari -> kelompok per bioskop pada hari terpilih
  const list = selected
    ? showtimes.filter((s) => s.cinema_id === selected.id)
    : showtimes;
  const firstOfDay = {};
  for (const s of list) firstOfDay[dayKey(s.starts_at)] ||= s.starts_at;
  const days = Object.keys(firstOfDay);
  const activeDay = days.includes(day) ? day : days[0];

  const byCinema = {};
  for (const s of list) {
    if (dayKey(s.starts_at) !== activeDay) continue;
    (byCinema[s.cinema_id] ||= { cinema: s.cinemas, items: [] }).items.push(s);
  }

  return (
    <article>
      {movie.backdrop_url && (
        <div
          className="relative mb-6 h-44 overflow-hidden rounded-2xl sm:h-60"
          style={{
            background: `linear-gradient(120deg, ${movie.poster_from}, ${movie.poster_to})`,
          }}
        >
          <Backdrop src={movie.backdrop_url} />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent"
          />
        </div>
      )}

      <div className="flex gap-4">
        <Poster
          movie={movie}
          showMeta={false}
          className="aspect-[2/3] w-32 shrink-0 sm:w-40"
        />
        <div>
          <h1 className="font-display text-3xl font-bold">{movie.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {movie.genre} · {movie.duration_min} menit · {scoreLabel(movie)}
            {year && ` · ${year}`}
          </p>
          <p className="mt-3 text-zinc-300">{movie.synopsis}</p>
          {isValidYoutubeKey(movie.trailer_key) && (
            <button
              type="button"
              onClick={() => setTrailerOpen(true)}
              className={`${btnGhost} mt-4`}
            >
              ▶ Tonton trailer
            </button>
          )}
        </div>
      </div>

      {trailerOpen && (
        <TrailerModal
          videoKey={movie.trailer_key}
          title={movie.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}

      <h2 className="mb-3 mt-8 font-display text-xl font-semibold">
        Jadwal tayang
      </h2>
      <CinemaPicker className="mb-5" />

      {showtimes.length === 0 ? (
        <Empty title="Belum ada jadwal">
          Untuk pembuat web: jalankan <code>select refresh_showtimes(7);</code>{" "}
          di Supabase SQL Editor.
        </Empty>
      ) : list.length === 0 ? (
        <Empty title={`Film ini belum tayang di ${selected.name}`}>
          <button
            type="button"
            onClick={() => select(null)}
            className="underline"
          >
            Lihat semua bioskop
          </button>
        </Empty>
      ) : (
        <>
          <div
            role="group"
            aria-label="Pilih tanggal"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {days.map((d) => {
              const { top, bottom } = fmtDayChip(firstOfDay[d]);
              const active = d === activeDay;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDay(d)}
                  className={`min-h-12 shrink-0 rounded-xl border px-4 py-1.5 text-center ${
                    active
                      ? "border-amber-400 bg-amber-400 text-zinc-950"
                      : "border-zinc-700 text-zinc-300 hover:border-amber-400"
                  }`}
                >
                  <span className="block text-xs">{top}</span>
                  <span className="block text-sm font-semibold">{bottom}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-4">
            {Object.entries(byCinema).map(([cinemaId, { cinema, items }]) => (
              <section
                key={cinemaId}
                className="rounded-xl border border-zinc-800 p-4"
              >
                <h3 className="font-medium">
                  {cinema?.name}{" "}
                  <span className="text-sm font-normal text-zinc-400">
                    · {cinema?.city}
                  </span>
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {items.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/pilih-kursi/${s.id}`}
                        className="block min-h-11 rounded-xl border border-zinc-700 px-4 py-2 text-center hover:border-amber-400"
                      >
                        <span className="block font-semibold">
                          {fmtTime(s.starts_at)}
                        </span>
                        <span className="block text-xs text-zinc-400">
                          {s.studio} · {rupiah(s.price_regular)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
