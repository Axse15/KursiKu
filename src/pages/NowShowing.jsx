import { useState } from "react";
import { useCinema } from "../lib/cinema";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { useFilms } from "../lib/films";
import { fmtDayChip, fmtWhen, rupiah } from "../lib/config";
import { ratingOf } from "../lib/rank";
import { ageOf } from "../lib/age";
import { NEAR_MAX_KM, citiesOf, splitByNearest } from "../lib/browse";
import { rankCinemas, useUserLocation } from "../lib/geo";
import { fmtKm } from "../lib/nearby";
import CinemaPicker from "../components/CinemaPicker";
import FilmTabs from "../components/FilmTabs";
import MovieCard from "../components/MovieCard";
import PageHead from "../components/PageHead";
import {
  Empty,
  ErrorBox,
  SectionTitle,
  Skeleton,
  Sticker,
  fieldCls,
} from "../components/ui";

const SORTS = {
  jadwal: "Jadwal terdekat",
  populer: "Paling populer",
  rating: "Rating tertinggi",
  murah: "Harga termurah",
  diskon: "Diskon terbesar",
  baru: "Rilis terbaru",
};

const AGES = ["Semua", "SU", "13+", "17+", "21+"];

export const GRID =
  "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5";

// Satu baris status lokasi di bawah pemilih bioskop (hanya kalau pengguna belum memilih bioskop sendiri).
function LocationNote({ geo, far, nearest }) {
  const cls = "mt-3 text-sm text-ink-2";
  const btn =
    "inline-flex min-h-11 items-center font-bold text-accent-ink underline";
  if (geo.status === "locating")
    return (
      <p role="status" className={cls}>
        📍 Mencari bioskop terdekat dari lokasimu…
      </p>
    );
  if (geo.status === "ok" && far && nearest) {
    return (
      <p className={cls}>
        Belum ada cabang KursiKu dekat lokasimu (yang terdekat:{" "}
        {nearest.cinema.name}, {fmtKm(nearest.km)}), jadi semua film
        ditampilkan.
      </p>
    );
  }
  if (geo.status === "denied" || geo.status === "unavailable") {
    return (
      <p className={cls}>
        {geo.status === "denied"
          ? "Izin lokasi ditolak, jadi film tidak dikelompokkan menurut bioskop terdekat. "
          : "Lokasimu tidak bisa ditentukan. "}
        <button type="button" onClick={geo.request} className={btn}>
          Coba lagi
        </button>
      </p>
    );
  }
  if (geo.status === "idle") {
    return (
      <p className={cls}>
        <button type="button" onClick={geo.request} className={btn}>
          📍 Tampilkan film di bioskop terdekat dari lokasiku
        </button>
      </p>
    );
  }
  return null;
}

export default function NowShowing() {
  const [genre, setGenre] = useState("Semua");
  const [sort, setSort] = useState("jadwal");
  const [ageFilter, setAgeFilter] = useState("Semua");
  const {
    cinemas,
    selected,
    select,
    error: cinemaError,
    reload: reloadCinemas,
    loading: cinemaLoading,
  } = useCinema();
  const { loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  const cinemaId = selected?.id ?? null;
  // Belum memilih bioskop -> cari bioskop terdekat otomatis (izin lokasi diminta sekali per sesi tab).
  // Menunggu data login/profil dulu, karena bioskop favorit di profil bisa menentukan pilihan.
  const geo = useUserLocation({
    auto: !selected && !cinemaLoading && !authLoading && !profileLoading,
  });

  const {
    data,
    loading,
    error,
    reload,
    next,
    where,
    fromPrice,
    bestDeal,
    info,
    nowShowing,
    upcoming,
  } = useFilms(cinemaId);

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
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <div className={GRID}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  const counts = {};
  for (const m of nowShowing) counts[m.genre] = (counts[m.genre] || 0) + 1;
  const genres = Object.keys(counts).sort();
  const activeGenre = genres.includes(genre) ? genre : "Semua"; // genre bisa hilang saat ganti bioskop

  const sorters = {
    jadwal: (a, b) => new Date(next[a.id]) - new Date(next[b.id]),
    populer: (a, b) =>
      (Number(b.popularity) || 0) - (Number(a.popularity) || 0),
    rating: (a, b) => (ratingOf(b) ?? 0) - (ratingOf(a) ?? 0),
    murah: (a, b) => fromPrice[a.id] - fromPrice[b.id],
    diskon: (a, b) =>
      (bestDeal[b.id]?.pct || 0) - (bestDeal[a.id]?.pct || 0) ||
      new Date(next[a.id]) - new Date(next[b.id]),
    baru: (a, b) =>
      String(b.release_date || "").localeCompare(
        String(a.release_date || ""),
      ) || b.id - a.id,
  };
  const shown = nowShowing
    .filter(
      (m) =>
        (activeGenre === "Semua" || m.genre === activeGenre) &&
        (ageFilter === "Semua" || ageOf(m)?.label === ageFilter),
    )
    .sort(sorters[sort] || sorters.jadwal);

  // Pengelompokan menurut bioskop KursiKu terdekat (hanya kalau belum memilih bioskop sendiri dan lokasi diketahui).
  const nearest =
    !selected && geo.status === "ok"
      ? rankCinemas(cinemas, geo.lat, geo.lon)[0] || null
      : null;
  const far = !!nearest && nearest.km > NEAR_MAX_KM;
  const { here, elsewhere, split } = splitByNearest(
    shown,
    where,
    nearest && !far ? nearest.cinema.id : null,
  );
  const cityById = {};
  for (const c of cinemas) cityById[String(c.id)] = c.city;

  const place = selected
    ? `${selected.name}, ${selected.city}`
    : `${cinemas.length} bioskop`;
  const field = `mt-1 ${fieldCls}`;

  const card = (m, withCities = false) => {
    const d = bestDeal[m.id];
    return (
      <li key={m.id}>
        <MovieCard
          movie={m}
          tag={info[m.id].status === "new" ? "new" : null}
          deal={d ? { pct: d.pct, day: fmtDayChip(d.at).top } : null}
          note={
            withCities ? `Tayang di ${citiesOf(m.id, where, cityById)}` : null
          }
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

  return (
    <div className="space-y-8">
      <PageHead
        id="tayang-judul"
        title="Sedang tayang"
        tone="yellow"
        sub={`${nowShowing.length} film · ${place}`}
      >
        <FilmTabs
          active="now"
          nowCount={nowShowing.length}
          soonCount={upcoming.length}
          className="mt-5"
        />
        <CinemaPicker className="mt-4" />
        {!selected && <LocationNote geo={geo} far={far} nearest={nearest} />}
      </PageHead>

      {nowShowing.length === 0 ? (
        selected ? (
          <Empty title={`Belum ada jadwal di ${selected.name}`}>
            <button
              type="button"
              onClick={() => select(null)}
              className="font-bold text-accent-ink underline"
            >
              Lihat semua bioskop
            </button>
          </Empty>
        ) : (
          <Empty title="Belum ada jadwal tayang">
            Untuk pembuat web: jalankan{" "}
            <code>select refresh_showtimes(7);</code> di Supabase SQL Editor.
          </Empty>
        )
      ) : (
        <section aria-labelledby="daftar-judul">
          <h2 id="daftar-judul" className="sr-only">
            Daftar film sedang tayang
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:nb-flat sm:grid-cols-3 sm:p-4">
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
                  Semua kategori ({nowShowing.length})
                </option>
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g} ({counts[g]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="usia" className="text-xs font-bold text-muted">
                Batas usia
              </label>
              <select
                id="usia"
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className={field}
              >
                {AGES.map((a) => (
                  <option key={a} value={a}>
                    {a === "Semua"
                      ? "Semua usia"
                      : a === "SU"
                        ? "SU (semua umur)"
                        : a}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
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
          <p className="mt-2 text-xs text-muted">
            Penanda usia (SU, 13+, 17+, 21+) adalah perkiraan dari data film,
            bukan klasifikasi resmi LSF.
          </p>

          {shown.length === 0 ? (
            <div className="mt-6">
              <Empty title="Tidak ada film yang cocok">
                Coba kategori atau batas usia lain.
              </Empty>
            </div>
          ) : split ? (
            <div className="mt-8 space-y-12">
              {here.length > 0 && (
                <div>
                  <SectionTitle
                    sub={`${nearest.cinema.city} · ${fmtKm(nearest.km)} dari lokasimu · ${here.length} film`}
                    aside={<Sticker>Terdekat</Sticker>}
                  >
                    {`Tayang di ${nearest.cinema.name}`}
                  </SectionTitle>
                  <ul className={GRID}>{here.map((m) => card(m))}</ul>
                </div>
              )}
              {elsewhere.length > 0 && (
                <div>
                  <SectionTitle
                    sub={`${elsewhere.length} film tidak tayang di ${nearest.cinema.name}. Pilih bioskop di atas untuk melihat jadwalnya.`}
                  >
                    Hanya di bioskop lain
                  </SectionTitle>
                  <ul className={GRID}>
                    {elsewhere.map((m) => card(m, true))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <ul className={`mt-6 ${GRID}`}>{shown.map((m) => card(m))}</ul>
          )}
        </section>
      )}
    </div>
  );
}
