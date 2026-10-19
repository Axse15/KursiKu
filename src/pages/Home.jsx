import { useState } from "react";
import { Link } from "react-router-dom";
import { useCinema } from "../lib/cinema";
import { useFilms } from "../lib/films";
import { fmtDayChip, fmtWhen, rupiah } from "../lib/config";
import { ratingOf } from "../lib/rank";
import { buildFeatured } from "../lib/featured";
import { useRanking } from "../lib/useRanking";
import { fmtReleaseShort, untilLabel } from "../lib/release";
import Banner from "../components/Banner";
import MovieCard from "../components/MovieCard";
import PromoStrip from "../components/PromoStrip";
import {
  Empty,
  ErrorBox,
  Poster,
  SectionTitle,
  Skeleton,
} from "../components/ui";
import { GRID } from "./NowShowing";

const PREVIEW = 10; // jumlah kartu di beranda; selebihnya lewat "Lihat semua"
const TOP_N = 5; // jumlah film di petak "Film terlaris"

// Tumpukan poster kecil di petak "Sedang tayang" / "Coming soon"
function PosterStack({ movies }) {
  return (
    <span aria-hidden="true" className="flex -space-x-4">
      {movies.slice(0, 3).map((m) => (
        <Poster
          key={m.id}
          movie={m}
          showMeta={false}
          compact
          className="aspect-[2/3] w-14 shrink-0 rounded-lg shadow-nb"
        />
      ))}
    </span>
  );
}

function CountTile({ to, tone, title, count, unit, hint, movies }) {
  return (
    <Link
      to={to}
      className={`group nb-card nb-lift flex flex-1 items-center justify-between gap-4 p-5 ${tone}`}
    >
      <span className="min-w-0">
        <span className="block font-display text-2xl font-extrabold leading-tight tracking-tight">
          {title}
        </span>
        <span className="mt-1 block text-sm text-ink-2">
          <span className="tnum font-bold">{count}</span> {unit}
        </span>
        <span className="mt-2 block text-sm font-bold group-hover:underline">
          {hint} <span aria-hidden="true">›</span>
        </span>
      </span>
      <PosterStack movies={movies} />
    </Link>
  );
}

// Petak "Film terlaris" di beranda: rekomendasi utama + 5 teratas. Kalau datanya gagal dimuat, petak disembunyikan
// (beranda tidak boleh ikut error hanya karena peringkat). Isi lengkapnya di halaman Terlaris.
function TopSellers({ ranking }) {
  const { rows, loading, error } = ranking;
  if (error) return null;
  if (loading || !rows) return <Skeleton className="h-64" />;
  if (rows.length === 0) return null;
  const best = rows[0];
  const list = rows.slice(0, TOP_N);
  return (
    <section
      aria-labelledby="terlaris-home"
      className="grid gap-5 lg:grid-cols-12"
    >
      <div className="nb-card flex gap-4 bg-tile-yellow p-5 sm:gap-5 lg:col-span-5">
        <Poster
          movie={best.movie}
          showMeta={false}
          compact
          className="aspect-[2/3] w-24 shrink-0 self-start rounded-lg shadow-nb sm:w-28"
        />
        <div className="min-w-0 self-center">
          <h2 id="terlaris-home" className="text-sm font-bold text-ink-2">
            Rekomendasi untukmu
          </h2>
          <Link
            to={`/film/${best.movie.id}`}
            className="mt-1 block font-display text-2xl font-extrabold leading-tight tracking-tight hover:underline sm:text-3xl"
          >
            {best.movie.title}
          </Link>
          {best.values.tickets > 0 && (
            <p className="tnum mt-1 text-sm">
              <strong>{best.values.tickets}</strong> tiket terjual dalam 30 hari
              terakhir
            </p>
          )}
          <Link
            to={`/film/${best.movie.id}`}
            className="nb-lift mt-3 inline-flex min-h-11 items-center rounded-xl border-2 border-edge bg-ink px-5 text-sm font-bold text-page shadow-nb"
          >
            Lihat jadwal
          </Link>
        </div>
      </div>

      <div className="nb-card bg-tile-blue p-5 lg:col-span-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-xl font-extrabold leading-tight tracking-tight">
            Film terlaris
          </h2>
          <Link
            to="/terlaris"
            className="inline-flex min-h-11 items-center text-sm font-bold underline"
          >
            Lihat peringkat lengkap <span aria-hidden="true">›</span>
          </Link>
        </div>
        <ol className="mt-2 space-y-1">
          {list.map((r) => (
            <li key={r.movie.id}>
              <Link
                to={`/film/${r.movie.id}`}
                className="flex min-h-11 items-center gap-3 rounded-lg px-1 hover:bg-white/30"
              >
                <span className="tnum grid size-7 shrink-0 place-items-center rounded-lg border-2 border-edge bg-panel text-sm font-extrabold">
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {r.movie.title}
                </span>
                <span className="tnum shrink-0 text-xs text-ink-2">
                  {r.values.tickets > 0
                    ? `${r.values.tickets} tiket`
                    : "Belum ada penjualan"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function Home() {
  const [tab, setTab] = useState("now"); // 'now' | 'soon'
  const {
    cinemas,
    selected,
    error: cinemaError,
    reload: reloadCinemas,
  } = useCinema();
  const cinemaId = selected?.id ?? null;
  const {
    data,
    loading,
    error,
    reload,
    next,
    fromPrice,
    bestDeal,
    info,
    nowShowing,
    upcoming,
  } = useFilms(cinemaId);
  const ranking = useRanking(); // dipanggil sebelum return awal supaya urutan hook tetap

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
        <div className="grid gap-5 lg:grid-cols-12">
          <Skeleton className="h-[26rem] lg:col-span-8" />
          <div className="grid gap-5 lg:col-span-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
        <div className={GRID}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  if (data.movies.length === 0) {
    return (
      <Empty title="Belum ada film">
        Isi data lewat <code>supabase.sql</code> atau <code>import.sql</code>.
      </Empty>
    );
  }

  // Banner: satu slide per kategori (promo, rating, populer, baru, segera), pilihan filmnya berganti tiap hari
  const slides = buildFeatured({ nowShowing, upcoming, info, bestDeal });
  const topRated = [...nowShowing]
    .sort((a, b) => (ratingOf(b) ?? 0) - (ratingOf(a) ?? 0))
    .slice(0, 3);
  const soonSorted = upcoming;
  const nowSorted = [...nowShowing].sort(
    (a, b) => new Date(next[a.id]) - new Date(next[b.id]),
  );

  const card = (m) => {
    const d = bestDeal[m.id];
    return (
      <li key={m.id}>
        <MovieCard
          movie={m}
          tag={info[m.id].status === "new" ? "new" : null}
          deal={d ? { pct: d.pct, day: fmtDayChip(d.at).top } : null}
          left={fmtWhen(next[m.id])}
          right={
            <>
              <span className="sr-only">Mulai </span>
              {rupiah(fromPrice[m.id])}
            </>
          }
        />
      </li>
    );
  };

  const tabBtn = (key, label, count) => (
    <button
      type="button"
      aria-pressed={tab === key}
      onClick={() => setTab(key)}
      className={`flex min-h-11 items-center gap-2 rounded-xl border-2 border-edge px-4 text-sm font-bold transition-colors ${
        tab === key ? "bg-ink text-page" : "bg-panel text-ink hover:bg-raised"
      }`}
    >
      {label} <span className="tnum text-xs opacity-80">{count}</span>
    </button>
  );

  const list = tab === "now" ? nowSorted : soonSorted;

  return (
    <div className="space-y-8">
      <h1 className="sr-only">KursiKu: pesan tiket bioskop</h1>

      {/* bento atas: banner besar + dua petak pintu masuk */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {slides.length > 0 ? (
            <Banner key={cinemaId ?? "all"} slides={slides} next={next} />
          ) : null}
        </div>
        <div className="flex flex-col gap-5 md:grid md:grid-cols-2 lg:col-span-4 lg:flex lg:flex-col">
          <CountTile
            to="/sedang-tayang"
            tone="bg-tile-yellow"
            title="Sedang tayang"
            count={nowShowing.length}
            unit={
              nowShowing.length === 1
                ? "film bisa dipesan"
                : "film bisa dipesan"
            }
            hint="Lihat semua"
            movies={nowSorted}
          />
          <CountTile
            to="/segera-hadir"
            tone="bg-tile-lilac"
            title="Coming soon"
            count={upcoming.length}
            unit="film akan datang"
            hint="Intip daftarnya"
            movies={soonSorted}
          />
        </div>
      </div>

      {/* bento tengah: promo, pilihan bioskop, rating tertinggi */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <PromoStrip />

        <Link
          to="/bioskop"
          className="group nb-card nb-lift flex flex-col justify-between gap-4 bg-tile-green p-5"
        >
          <span className="font-display text-xl font-extrabold leading-tight tracking-tight">
            Pilihan bioskop
          </span>
          <span className="text-sm text-ink-2">
            {selected ? (
              <>
                Kamu memilih <strong>{selected.name}</strong>, {selected.city}.
              </>
            ) : (
              <>
                Menampilkan film dari semua {cinemas.length} cabang KursiKu.
                Pilih satu cabang untuk jadwal yang lebih pas.
              </>
            )}
          </span>
          <span className="text-sm font-bold group-hover:underline">
            {selected ? "Ganti bioskop" : "Pilih bioskop"}{" "}
            <span aria-hidden="true">›</span>
          </span>
        </Link>

        <section
          aria-labelledby="top-rating"
          className="nb-card bg-tile-blue p-5 md:col-span-2 lg:col-span-1"
        >
          <h2
            id="top-rating"
            className="font-display text-xl font-extrabold leading-tight tracking-tight"
          >
            Rating tertinggi
          </h2>
          {topRated.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">Belum ada film tayang.</p>
          ) : (
            <ol className="mt-3 space-y-1">
              {topRated.map((m, i) => (
                <li key={m.id}>
                  <Link
                    to={`/film/${m.id}`}
                    className="flex min-h-11 items-center gap-3 rounded-lg px-1 hover:bg-white/30"
                  >
                    <span className="tnum grid size-7 shrink-0 place-items-center rounded-lg border-2 border-edge bg-panel text-sm font-extrabold">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {m.title}
                    </span>
                    <span className="tnum shrink-0 text-sm font-bold">
                      ★ {ratingOf(m)?.toFixed(1) ?? "-"}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* film terlaris + rekomendasi */}
      <TopSellers ranking={ranking} />

      {/* pilihan: sedang tayang / coming soon */}
      <section aria-labelledby="pilihan-judul">
        <SectionTitle
          id="pilihan-judul"
          sub={
            tab === "now"
              ? selected
                ? `${selected.name}, ${selected.city}`
                : `Dari semua ${cinemas.length} cabang KursiKu`
              : "Belum bisa dipesan. Jadwal dan tiket dibuka saat film rilis."
          }
          aside={
            <Link
              to={tab === "now" ? "/sedang-tayang" : "/segera-hadir"}
              className="inline-flex min-h-11 items-center text-sm font-bold text-accent-ink underline"
            >
              Lihat semua {list.length} film
            </Link>
          }
        >
          Pilih film
        </SectionTitle>

        <div
          role="group"
          aria-label="Jenis daftar film"
          className="mb-5 flex flex-wrap gap-2"
        >
          {tabBtn("now", "Sedang tayang", nowShowing.length)}
          {tabBtn("soon", "Coming soon", upcoming.length)}
        </div>

        {list.length === 0 ? (
          <Empty
            title={
              tab === "now"
                ? "Belum ada jadwal tayang"
                : "Belum ada film yang akan datang"
            }
          >
            {tab === "now" ? (
              <>
                Untuk pembuat web: jalankan{" "}
                <code>select refresh_showtimes(7);</code> di Supabase SQL
                Editor.
              </>
            ) : (
              "Daftar akan terisi setelah impor TMDB dijalankan."
            )}
          </Empty>
        ) : tab === "now" ? (
          <ul className={GRID}>{list.slice(0, PREVIEW).map((m) => card(m))}</ul>
        ) : (
          <ul className={GRID}>
            {list.slice(0, PREVIEW).map((m) => (
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
        )}
      </section>
    </div>
  );
}
