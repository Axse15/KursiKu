import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useCinema } from "../lib/cinema";
import { dayKey, fmtDayChip, fmtTime, rupiah, scoreLabel } from "../lib/config";
import { dealPercent, dealPrice } from "../lib/deals";
import { rankCinemas, useUserLocation } from "../lib/geo";
import { fmtKm } from "../lib/nearby";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import CinemaPicker from "../components/CinemaPicker";
import NearbyCinemas from "../components/NearbyCinemas";
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
  const { cinemas, selected, select, loading: cinemaLoading } = useCinema();
  const { loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  const [day, setDay] = useState(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  // Pengguna belum memilih bioskop -> cari yang terdekat otomatis (minta izin lokasi sekali per sesi tab).
  // Menunggu data login/profil dulu, karena bioskop favorit di profil bisa menentukan pilihan.
  const geo = useUserLocation({
    auto: !selected && !cinemaLoading && !authLoading && !profileLoading,
  });

  const { data, loading, error, reload } = useAsync(async () => {
    const movie = unwrap(
      await supabase.from("movies").select("*").eq("id", id).maybeSingle(),
    );
    if (!movie) return { movie: null, showtimes: [] };
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

  // urutkan bioskop KursiKu dari yang terdekat (kalau lokasi diketahui)
  const kmOf = {};
  if (geo.status === "ok")
    for (const r of rankCinemas(cinemas, geo.lat, geo.lon))
      kmOf[String(r.cinema.id)] = r.km;
  const groups = Object.entries(byCinema).sort(
    ([a], [b]) => (kmOf[a] ?? 1e9) - (kmOf[b] ?? 1e9),
  );
  const nearestId =
    groups.length > 0 && kmOf[groups[0][0]] != null ? groups[0][0] : null;
  const nearest = nearestId
    ? { cinema: groups[0][1].cinema, km: kmOf[nearestId] }
    : null;

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
            className="absolute inset-0 bg-gradient-to-t from-page/80 via-transparent to-transparent"
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
          <p className="mt-1 text-sm text-muted">
            {movie.genre} · {movie.duration_min} menit{year && ` · ${year}`}
          </p>
          <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {movie.vote_average ? (
              <span className="rounded border border-line-strong px-2 py-0.5">
                ★ {Number(movie.vote_average).toFixed(1)} TMDB
              </span>
            ) : (
              <span className="rounded border border-line-strong px-2 py-0.5">
                {scoreLabel(movie)}
              </span>
            )}
            {movie.imdb_rating && (
              <span className="rounded border border-line-strong px-2 py-0.5">
                IMDb {Number(movie.imdb_rating).toFixed(1)}
              </span>
            )}
            {movie.age_rated && (
              <span className="rounded border border-line-strong px-2 py-0.5">
                {movie.age_rated}
              </span>
            )}
          </p>
          <p className="mt-3 text-ink-2">{movie.synopsis}</p>
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
      {!selected && list.length > 0 && (
        <NearbyCinemas
          geo={geo}
          nearest={nearest}
          onPick={() => select(nearestId)}
        />
      )}

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
              const pct = dealPercent(movie.id, firstOfDay[d]);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDay(d)}
                  className={`min-h-12 shrink-0 rounded-xl border px-4 py-1.5 text-center ${
                    active
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line-strong text-ink-2 hover:border-accent"
                  }`}
                >
                  <span className="block text-xs">{top}</span>
                  <span className="block text-sm font-semibold">{bottom}</span>
                  {pct > 0 && (
                    <span
                      className={`block text-[11px] font-bold ${active ? "" : "text-accent-ink"}`}
                    >
                      −{pct}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {days.some((d) => dealPercent(movie.id, firstOfDay[d]) > 0) && (
            <p className="mt-2 text-xs text-muted">
              Angka −% di bawah tanggal adalah diskon film untuk hari itu.
              Diskon berganti setiap hari.
            </p>
          )}

          <div className="mt-4 space-y-4">
            {groups.map(([cinemaId, { cinema, items }]) => (
              <section
                key={cinemaId}
                className={`rounded-xl border p-4 ${cinemaId === nearestId ? "border-accent" : "border-line"}`}
              >
                <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                  <span>
                    {cinema?.name}{" "}
                    <span className="text-sm font-normal text-muted">
                      · {cinema?.city}
                    </span>
                  </span>
                  {kmOf[cinemaId] != null && (
                    <span className="text-xs font-normal text-muted">
                      {fmtKm(kmOf[cinemaId])}
                    </span>
                  )}
                  {cinemaId === nearestId && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent">
                      Terdekat
                    </span>
                  )}
                </h3>
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                  {items.map((s) => {
                    const pct = dealPercent(movie.id, s.starts_at);
                    return (
                      <li key={s.id}>
                        <Link
                          to={`/pilih-kursi/${s.id}`}
                          className="block min-h-11 rounded-xl border border-line-strong px-4 py-2 text-center hover:border-accent"
                        >
                          <span className="block font-semibold">
                            {fmtTime(s.starts_at)}
                          </span>
                          <span className="block text-xs text-muted">
                            {s.studio}
                          </span>
                          {pct > 0 && (
                            <span className="block text-xs text-faint line-through">
                              {rupiah(s.price_regular)}
                            </span>
                          )}
                          <span
                            className={`block text-xs ${pct > 0 ? "font-semibold text-accent-ink" : "text-muted"}`}
                          >
                            {rupiah(dealPrice(s.price_regular, pct))}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
