import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useCinema } from "../lib/cinema";
import { dayKey, fmtDayChip, fmtTime, rupiah, scoreLabel } from "../lib/config";
import { dealPercent, dealPrice } from "../lib/deals";
import { rankCinemas, useUserLocation } from "../lib/geo";
import { fmtKm } from "../lib/nearby";
import { fmtReleaseLong, releaseInfo, untilLabel } from "../lib/release";
import { ageNote, ageOf } from "../lib/age";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import CinemaPicker from "../components/CinemaPicker";
import NearbyCinemas from "../components/NearbyCinemas";
import ReleaseTag from "../components/ReleaseTag";
import TrailerModal, { isValidYoutubeKey } from "../components/TrailerModal";
import AgeBadge from "../components/AgeBadge";
import {
  Backdrop,
  Chip,
  Empty,
  ErrorBox,
  Poster,
  SectionTitle,
  Skeleton,
  Sticker,
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
        <Link to="/" className="font-semibold text-accent-ink underline">
          Kembali ke beranda
        </Link>
      </Empty>
    );
  }

  const { movie, showtimes } = data;
  const rel = releaseInfo(movie);
  const soon = rel.status === "soon";
  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;
  const age = ageOf(movie);

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

  // urutkan bioskop dari yang terdekat (kalau lokasi diketahui); yang tak punya koordinat di belakang
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
    <article className="space-y-8">
      <div className="on-photo nb-card relative overflow-hidden bg-[#13111f] p-4 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${movie.poster_from}, ${movie.poster_to})`,
          }}
        />
        <Backdrop src={movie.backdrop_url} />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40"
        />
        <div className="relative flex gap-4 sm:gap-8">
          <Poster
            movie={movie}
            showMeta={false}
            className="aspect-[2/3] w-28 shrink-0 self-start rounded-xl !border-white shadow-2xl sm:w-48"
          />
          <div className="min-w-0">
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              {movie.title}
            </h1>
            {rel.status !== "now" && (
              <ReleaseTag info={rel} onDark className="mt-3" />
            )}
            <p className="mt-3 text-sm text-white/90">
              {movie.genre} · {movie.duration_min} menit{year && ` · ${year}`}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
              <AgeBadge age={age} onPhoto />
              {movie.vote_average ? (
                <span className="rounded-lg border-2 border-white/70 px-2 py-0.5">
                  ★ {Number(movie.vote_average).toFixed(1)} TMDB
                </span>
              ) : (
                <span className="rounded-lg border-2 border-white/70 px-2 py-0.5">
                  {scoreLabel(movie)}
                </span>
              )}
              {movie.imdb_rating && (
                <span className="rounded-lg border-2 border-white/70 px-2 py-0.5">
                  IMDb {Number(movie.imdb_rating).toFixed(1)}
                </span>
              )}
            </p>
            <p className="mt-4 hidden max-w-2xl leading-relaxed text-white/90 sm:block">
              {movie.synopsis}
            </p>
            {isValidYoutubeKey(movie.trailer_key) && (
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="nb-lift mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-white bg-white px-5 text-sm font-bold text-black"
              >
                ▶ Tonton trailer
              </button>
            )}
          </div>
        </div>
        <p className="relative mt-4 text-sm leading-relaxed text-white/90 sm:hidden">
          {movie.synopsis}
        </p>
      </div>

      {trailerOpen && (
        <TrailerModal
          videoKey={movie.trailer_key}
          title={movie.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}

      <FilmFacts movie={movie} age={age} />

      {soon ? (
        <section
          className="nb-card bg-tile-lilac p-5"
          aria-labelledby="segera-info"
        >
          <h2
            id="segera-info"
            className="text-2xl font-extrabold tracking-tight"
          >
            Coming soon
          </h2>
          <p className="mt-2 text-ink">
            Rilis {fmtReleaseLong(rel.date)} (
            {untilLabel(rel.days).toLowerCase()}).
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Jadwal dan tiket dibuka saat film rilis. Sementara itu, kamu bisa
            menonton trailernya.
          </p>
        </section>
      ) : (
        <>
          <div>
            <SectionTitle>Jadwal tayang</SectionTitle>
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
                Untuk pembuat web: jalankan{" "}
                <code>select refresh_showtimes(7);</code> di Supabase SQL
                Editor.
              </Empty>
            ) : list.length === 0 ? (
              <Empty title={`Film ini belum tayang di ${selected.name}`}>
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="font-semibold text-accent-ink underline"
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
                        className={`min-h-12 shrink-0 rounded-xl border-2 border-edge px-4 py-1.5 text-center transition-colors ${
                          active
                            ? "bg-ink text-page"
                            : "bg-panel text-ink hover:bg-raised"
                        }`}
                      >
                        <span className="block text-xs">{top}</span>
                        <span className="block text-sm font-bold">
                          {bottom}
                        </span>
                        {pct > 0 && (
                          <span
                            className={`block text-[11px] font-semibold ${active ? "" : "text-accent-ink"}`}
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

                <div className="mt-4 grid gap-4 md:grid-cols-2 md:items-start">
                  {groups.map(([cinemaId, { cinema, items }]) => (
                    <section
                      key={cinemaId}
                      className={`nb-card p-4 ${cinemaId === nearestId ? "bg-tile-green" : ""}`}
                    >
                      <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-extrabold leading-tight tracking-tight">
                        <span>
                          {cinema?.name}{" "}
                          <span className="text-sm font-normal text-ink-2">
                            · {cinema?.city}
                          </span>
                        </span>
                        {kmOf[cinemaId] != null && (
                          <span className="text-xs font-normal text-ink-2">
                            {fmtKm(kmOf[cinemaId])}
                          </span>
                        )}
                        {cinemaId === nearestId && <Sticker>Terdekat</Sticker>}
                      </h3>
                      <ul className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                        {items.map((s) => {
                          const pct = dealPercent(movie.id, s.starts_at);
                          return (
                            <li key={s.id}>
                              <Link
                                to={`/pilih-kursi/${s.id}`}
                                className="nb-lift block min-h-11 rounded-xl border-2 border-edge bg-panel px-4 py-2 text-center shadow-nb"
                              >
                                <span className="tnum block text-lg font-semibold">
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
                                  className={`tnum block text-xs ${pct > 0 ? "font-semibold text-accent-ink" : "text-muted"}`}
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
          </div>
        </>
      )}
    </article>
  );
}

// Satu baris keterangan film (label + isi). Tidak tampil kalau datanya kosong.
function Fact({ label, children }) {
  if (!children) return null;
  return (
    <div className="grid gap-0.5 border-b-2 border-line py-2.5 last:border-b-0 sm:grid-cols-[7rem_1fr] sm:gap-4 md:grid-cols-1 md:gap-0.5 lg:grid-cols-[8rem_1fr] lg:gap-4">
      <dt className="text-sm font-bold text-muted">{label}</dt>
      <dd className="text-sm font-semibold sm:text-base">{children}</dd>
    </div>
  );
}

// Keterangan lengkap film: jenis, produser, sutradara, penulis, produksi, pemeran, dan batas usia.
// Datanya dari TMDB (supabase-v9.sql + impor ulang). Bagian yang kosong disembunyikan.
function FilmFacts({ movie, age }) {
  const cast = Array.isArray(movie.cast_members)
    ? movie.cast_members.filter((c) => c?.name)
    : [];
  const genres = movie.genres || movie.genre;
  const hasCrew =
    movie.producers ||
    movie.director ||
    movie.writers ||
    movie.production ||
    cast.length > 0;

  return (
    <section
      aria-labelledby="info-film"
      className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
    >
      <div className="nb-card p-5 sm:p-6 lg:col-span-2">
        <h2 id="info-film" className="text-2xl font-extrabold tracking-tight">
          Info film
        </h2>
        <dl className="mt-3">
          <Fact label="Jenis Film">
            <span className="flex flex-wrap gap-1.5">
              {String(genres)
                .split(",")
                .map((g) => g.trim())
                .filter(Boolean)
                .map((g) => (
                  <Chip key={g} tone="plain">
                    {g}
                  </Chip>
                ))}
            </span>
          </Fact>
          <Fact label="Produser">{movie.producers}</Fact>
          <Fact label="Sutradara">{movie.director}</Fact>
          <Fact label="Penulis">{movie.writers}</Fact>
          <Fact label="Produksi">{movie.production}</Fact>
          <Fact label="Durasi">
            {movie.duration_min ? `${movie.duration_min} menit` : null}
          </Fact>
        </dl>
        {!hasCrew && (
          <p className="mt-3 text-sm text-muted">
            Data sutradara, produser, penulis, produksi, dan pemeran belum
            tersedia untuk film ini. Untuk pembuat web: jalankan{" "}
            <code>supabase-v9.sql</code>, lalu impor ulang TMDB.
          </p>
        )}
      </div>

      <div className="nb-card bg-tile-yellow p-5 sm:p-6 md:self-start">
        <h2 className="text-2xl font-extrabold tracking-tight">Batas usia</h2>
        {age ? (
          <>
            <p className="mt-3 flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-edge bg-panel font-display text-4xl font-extrabold shadow-nb"
              >
                {age.label}
              </span>
              <span>
                <span className="block text-lg font-extrabold leading-tight">
                  {age.long}
                </span>
                <span className="block text-sm text-ink-2">
                  Penonton di bawah batas ini sebaiknya tidak menonton.
                </span>
              </span>
            </p>
            <p className="mt-3 text-xs text-ink-2">
              {ageNote(age)} Klasifikasi resmi di Indonesia ditentukan Lembaga
              Sensor Film (LSF).
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-ink-2">
            Klasifikasi usia film ini belum tersedia.
          </p>
        )}
      </div>

      {cast.length > 0 && (
        <div className="nb-card bg-tile-lilac p-5 sm:p-6 md:col-span-2 lg:col-span-3">
          <h2 className="text-2xl font-extrabold tracking-tight">Casts</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {cast.map((c) => (
              <li key={c.name} className="nb-flat bg-panel p-3">
                <p className="text-sm font-bold leading-snug">{c.name}</p>
                {c.character && (
                  <p className="mt-0.5 text-xs text-muted">
                    sebagai {c.character}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
