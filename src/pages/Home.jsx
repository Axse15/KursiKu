import { useState } from "react";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useCinema } from "../lib/cinema";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { fmtDayChip, fmtWhen, rupiah } from "../lib/config";
import { dealPercent, dealPrice } from "../lib/deals";
import { ratingOf } from "../lib/rank";
import { buildFeatured } from "../lib/featured";
import { fmtReleaseShort, releaseInfo, untilLabel } from "../lib/release";
import { NEAR_MAX_KM, citiesOf, splitByNearest } from "../lib/browse";
import { rankCinemas, useUserLocation } from "../lib/geo";
import { fmtKm } from "../lib/nearby";
import CinemaPicker from "../components/CinemaPicker";
import Banner from "../components/Banner";
import MovieCard from "../components/MovieCard";
import PromoStrip from "../components/PromoStrip";
import { Empty, ErrorBox, Skeleton } from "../components/ui";

// "Sedang tayang" = film yang punya jadwal dalam 3 hari ke depan.
// Dibatasi 3 hari supaya jumlah barisnya kecil (batas bawaan Supabase 1000 baris per permintaan).
const WINDOW_MS = 3 * 86400000;

const SORTS = {
  jadwal: { label: "Jadwal terdekat" },
  populer: { label: "Paling populer" },
  rating: { label: "Rating tertinggi" },
  murah: { label: "Harga termurah" },
  diskon: { label: "Diskon terbesar" },
  baru: { label: "Rilis terbaru" },
};

const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5";

function SectionHead({ id, title, sub, badge = null, level = 2 }) {
  const H = `h${level}`;
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <H
          id={id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-2xl font-bold tracking-tight"
        >
          {title}
          {badge && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 font-sans text-xs font-semibold text-on-accent">
              {badge}
            </span>
          )}
        </H>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
    </div>
  );
}

// Satu baris status lokasi di bawah pemilih bioskop (hanya kalau pengguna belum memilih bioskop sendiri).
function LocationNote({ geo, far, nearest }) {
  const cls = "mt-3 text-sm text-muted";
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
  if (geo.status === "denied") {
    return (
      <p className={cls}>
        Izin lokasi ditolak, jadi film tidak dikelompokkan menurut bioskop
        terdekat.{" "}
        <button
          type="button"
          onClick={geo.request}
          className="inline-flex min-h-11 items-center text-accent-ink underline"
        >
          Coba lagi
        </button>
      </p>
    );
  }
  if (geo.status === "unavailable") {
    return (
      <p className={cls}>
        Lokasimu tidak bisa ditentukan.{" "}
        <button
          type="button"
          onClick={geo.request}
          className="inline-flex min-h-11 items-center text-accent-ink underline"
        >
          Coba lagi
        </button>
      </p>
    );
  }
  if (geo.status === "idle") {
    return (
      <p className={cls}>
        <button
          type="button"
          onClick={geo.request}
          className="inline-flex min-h-11 items-center text-accent-ink underline"
        >
          📍 Tampilkan film di bioskop terdekat dari lokasiku
        </button>
      </p>
    );
  }
  return null;
}

export default function Home() {
  const [genre, setGenre] = useState("Semua");
  const [sort, setSort] = useState("jadwal");
  const [query, setQuery] = useState("");
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

  const { data, loading, error, reload } = useAsync(async () => {
    const movies = unwrap(
      await supabase.from("movies").select("*").order("id"),
    );

    // Supabase membatasi 1000 baris per permintaan. Dengan banyak film, jadwal 3 hari bisa lebih dari itu,
    // jadi diambil per halaman 1000 baris (maksimal 5 halaman) supaya tidak ada film yang diam-diam hilang.
    const now = Date.now();
    const PAGE = 1000;
    const shows = [];
    for (let from = 0; from < 5 * PAGE; from += PAGE) {
      let q = supabase
        .from("showtimes")
        .select("movie_id, cinema_id, starts_at, price_regular")
        .gte("starts_at", new Date(now).toISOString())
        .lt("starts_at", new Date(now + WINDOW_MS).toISOString())
        .order("starts_at")
        .order("id")
        .range(from, from + PAGE - 1);
      if (cinemaId) q = q.eq("cinema_id", cinemaId);
      const part = unwrap(await q);
      shows.push(...part);
      if (part.length < PAGE) break;
    }

    // jadwal terdekat per film + bioskop mana saja yang menayangkannya
    const next = {};
    const where = {};
    const fromPrice = {}; // harga reguler termurah per film, sudah termasuk diskon film harian
    const bestDeal = {}; // diskon film terbesar dalam 3 hari ini: { pct, at }
    for (const s of shows) {
      if (!next[s.movie_id]) next[s.movie_id] = s.starts_at;
      (where[s.movie_id] ||= new Set()).add(s.cinema_id);
      const pct = dealPercent(s.movie_id, s.starts_at);
      const price = dealPrice(s.price_regular, pct);
      if (!(s.movie_id in fromPrice) || price < fromPrice[s.movie_id])
        fromPrice[s.movie_id] = price;
      if (pct > (bestDeal[s.movie_id]?.pct || 0))
        bestDeal[s.movie_id] = { pct, at: s.starts_at };
    }
    return { movies, next, where, fromPrice, bestDeal };
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
      <div className="space-y-10">
        <Skeleton className="h-[25rem] rounded-3xl" />
        <div className={GRID}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  const { movies, next, where, fromPrice, bestDeal } = data;
  if (movies.length === 0) {
    return (
      <Empty title="Belum ada film">
        Isi data lewat <code>supabase.sql</code> atau <code>import.sql</code>.
      </Empty>
    );
  }

  const info = {};
  for (const m of movies) info[m.id] = releaseInfo(m);
  const upcoming = movies
    .filter((m) => info[m.id].status === "soon")
    .sort((a, b) => info[a.id].days - info[b.id].days || b.id - a.id);
  const nowShowing = movies.filter(
    (m) => next[m.id] && info[m.id].status !== "soon",
  );

  // Banner: satu slide per kategori (promo, rating, populer, baru, segera), pilihan filmnya berganti tiap hari
  const slides = buildFeatured({ nowShowing, upcoming, info, bestDeal });

  const counts = {};
  for (const m of nowShowing) counts[m.genre] = (counts[m.genre] || 0) + 1;
  const genres = Object.keys(counts).sort();
  const activeGenre = genres.includes(genre) ? genre : "Semua"; // genre bisa hilang saat ganti bioskop
  const q = query.trim().toLowerCase();
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
        (!q || m.title.toLowerCase().includes(q)),
    )
    .sort(sorters[sort] || sorters.jadwal);
  // Film "Segera hadir" ikut pencarian dan kategori yang dipilih (supaya tidak muncul film yang tidak diminta)
  const upcomingShown = upcoming.filter(
    (m) =>
      (activeGenre === "Semua" || m.genre === activeGenre) &&
      (!q || m.title.toLowerCase().includes(q)),
  );

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
  const field =
    "mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-panel px-3";

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
    <div className="space-y-14">
      {slides.length > 0 && (
        <Banner key={cinemaId ?? "all"} slides={slides} next={next} />
      )}

      <PromoStrip />

      <section aria-labelledby="tayang-judul">
        <h1
          id="tayang-judul"
          className="font-display text-3xl font-bold tracking-tight"
        >
          Sedang tayang
        </h1>
        <p className="mt-1 text-muted">
          {nowShowing.length} film · {place}
        </p>

        <CinemaPicker className="mt-5" />
        {!selected && <LocationNote geo={geo} far={far} nearest={nearest} />}

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
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-[2fr_1fr_1fr]">
              <div className="col-span-2 lg:col-span-1">
                <label
                  htmlFor="cari"
                  className="text-xs font-medium text-muted"
                >
                  Cari film
                </label>
                <input
                  id="cari"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari judul film…"
                  className={`${field} placeholder:text-faint`}
                />
              </div>
              <div>
                <label
                  htmlFor="kategori"
                  className="text-xs font-medium text-muted"
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
                <label
                  htmlFor="urut"
                  className="text-xs font-medium text-muted"
                >
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
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="mt-8">
                <Empty title="Tidak ada film yang cocok">
                  Coba kata kunci atau kategori lain.
                </Empty>
              </div>
            ) : split ? (
              <div className="mt-10 space-y-14">
                {here.length > 0 && (
                  <div>
                    <SectionHead
                      title={`Tayang di ${nearest.cinema.name}`}
                      badge="Terdekat"
                      sub={`${nearest.cinema.city} · ${fmtKm(nearest.km)} dari lokasimu · ${here.length} film`}
                    />
                    <ul className={GRID}>{here.map((m) => card(m))}</ul>
                  </div>
                )}
                {elsewhere.length > 0 && (
                  <div>
                    <SectionHead
                      title="Hanya di bioskop lain"
                      sub={`${elsewhere.length} film tidak tayang di ${nearest.cinema.name}. Pilih bioskop di atas untuk melihat jadwalnya.`}
                    />
                    <ul className={GRID}>
                      {elsewhere.map((m) => card(m, true))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <ul className={`mt-8 ${GRID}`}>{shown.map((m) => card(m))}</ul>
            )}
          </>
        )}
      </section>

      {upcomingShown.length > 0 && (
        <section aria-labelledby="segera-judul">
          <SectionHead
            id="segera-judul"
            title="Segera hadir"
            sub="Belum bisa dipesan. Jadwal dan tiket dibuka saat film rilis."
          />
          <ul className={GRID}>
            {upcomingShown.slice(0, 10).map((m) => (
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
        </section>
      )}
    </div>
  );
}
