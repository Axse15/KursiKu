import { Link, useParams } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { fmtDate, fmtTime, rupiah, scoreLabel } from "../lib/config";
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

  const { data, loading, error, reload } = useAsync(async () => {
    const movie = unwrap(
      await supabase.from("movies").select("*").eq("id", id).maybeSingle(),
    );
    if (!movie) return { movie: null, showtimes: [] };
    const showtimes = unwrap(
      await supabase
        .from("showtimes")
        .select("*")
        .eq("movie_id", id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at"),
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

  // kelompokkan jadwal per tanggal
  const byDate = {};
  for (const s of showtimes) {
    const key = fmtDate(s.starts_at);
    (byDate[key] ||= []).push(s);
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
          {movie.trailer_key && (
            <a
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(movie.trailer_key)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnGhost} mt-4`}
            >
              ▶ Tonton trailer
            </a>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl font-semibold">
        Jadwal tayang
      </h2>
      {showtimes.length === 0 ? (
        <Empty title="Belum ada jadwal">
          Jadwal dummy sudah lewat. Jalankan ulang query jadwal di supabase.sql.
        </Empty>
      ) : (
        <div className="space-y-5">
          {Object.entries(byDate).map(([date, list]) => (
            <section key={date}>
              <h3 className="mb-2 text-sm font-medium capitalize text-zinc-400">
                {date}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {list.map((s) => (
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
      )}
    </article>
  );
}
