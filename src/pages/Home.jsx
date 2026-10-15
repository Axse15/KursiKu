import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useCinema } from "../lib/cinema";
import { fmtDayChip, fmtWhen, rupiah } from "../lib/config";
import { dealPercent, dealPrice } from "../lib/deals";
import { ratingOf, topPopular, topRated, topRecommended } from "../lib/rank";
import CinemaPicker from "../components/CinemaPicker";
import Banner from "../components/Banner";
import PromoStrip from "../components/PromoStrip";
import { Empty, ErrorBox, Poster, Skeleton } from "../components/ui";

const WINDOW_MS = 3 * 86400000;

const SORTS = {
  jadwal: { label: "Jadwal terdekat" },
  populer: { label: "Paling populer" },
  rating: { label: "Rating tertinggi" },
  murah: { label: "Harga termurah" },
  diskon: { label: "Diskon terbesar" },
};

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
  } = useCinema();
  const cinemaId = selected?.id ?? null;

  const { data, loading, error, reload } = useAsync(async () => {
    const movies = unwrap(
      await supabase.from("movies").select("*").order("id"),
    );

    const now = Date.now();
    let q = supabase
      .from("showtimes")
      .select("movie_id, cinema_id, starts_at, price_regular")
      .gte("starts_at", new Date(now).toISOString())
      .lt("starts_at", new Date(now + WINDOW_MS).toISOString())
      .order("starts_at")
      .limit(1000);
    if (cinemaId) q = q.eq("cinema_id", cinemaId);
    const shows = unwrap(await q);

    const next = {};
    const where = {};
    const fromPrice = {};
    const bestDeal = {};
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

  const { movies, next, where, fromPrice, bestDeal } = data;
  if (movies.length === 0) {
    return (
      <Empty title="Belum ada film">
        Isi data lewat <code>supabase.sql</code> atau <code>import.sql</code>.
      </Empty>
    );
  }

  const nowShowing = movies.filter((m) => next[m.id]);

  const bannerTabs = [
    {
      key: "rec",
      label: "Rekomendasi",
      list: topRecommended(nowShowing),
      hint: "Gabungan rating dan popularitas film yang sedang tayang.",
    },
    {
      key: "pop",
      label: "Terpopuler",
      list: topPopular(nowShowing),
      hint: "Berdasarkan skor popularitas TMDB, bukan jumlah tiket KursiKu (ini simulasi).",
    },
    {
      key: "rated",
      label: "Rating bagus",
      list: topRated(nowShowing),
      hint: "Nilai IMDb kalau ada, kalau tidak nilai TMDB. Film dengan suara terlalu sedikit tidak dihitung.",
    },
  ].filter((t) => t.list.length > 0);

  const counts = {};
  for (const m of nowShowing) counts[m.genre] = (counts[m.genre] || 0) + 1;
  const genres = Object.keys(counts).sort();
  const activeGenre = genres.includes(genre) ? genre : "Semua";
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
  };
  const shown = nowShowing
    .filter(
      (m) =>
        (activeGenre === "Semua" || m.genre === activeGenre) &&
        (!q || m.title.toLowerCase().includes(q)),
    )
    .sort(sorters[sort] || sorters.jadwal);

  const place = selected
    ? `${selected.name}, ${selected.city}`
    : `${cinemas.length} bioskop`;
  const field =
    "mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-panel px-3";

  return (
    <div className="space-y-10">
      {bannerTabs.length > 0 && (
        <Banner key={cinemaId ?? "all"} tabs={bannerTabs} next={next} />
      )}

      <PromoStrip />

      <section>
        <h1 className="font-display text-3xl font-bold">Sedang tayang</h1>
        <p className="mt-1 text-muted">
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
              <div className="sm:col-span-2 lg:col-span-1">
                <label
                  htmlFor="cari"
                  className="text-sm font-medium text-ink-2"
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
                  className="text-sm font-medium text-ink-2"
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
                  className="text-sm font-medium text-ink-2"
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
              <div className="mt-6">
                <Empty title="Tidak ada film yang cocok">
                  Coba kata kunci atau kategori lain.
                </Empty>
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                {shown.map((m) => (
                  <li key={m.id}>
                    <Link to={`/film/${m.id}`} className="group block">
                      <div className="relative transition duration-300 group-hover:-translate-y-1">
                        <Poster
                          movie={m}
                          className="aspect-[2/3] shadow-lg shadow-black/40 transition duration-300 group-hover:shadow-accent/10"
                        />
                        {bestDeal[m.id] && (
                          <span className="absolute bottom-2 right-2 rounded-md bg-accent px-2 py-1 text-xs font-bold text-on-accent shadow">
                            −{bestDeal[m.id].pct}%
                          </span>
                        )}
                      </div>
                      <p className="mt-3 line-clamp-1 text-sm font-medium text-ink-2">
                        {m.title}
                      </p>
                      <p className="text-sm text-muted">
                        {m.duration_min} menit
                        {!selected && ` · ${where[m.id].size} bioskop`}
                      </p>
                      <p className="text-sm font-medium text-accent-ink">
                        {fmtWhen(next[m.id])}
                      </p>
                      <p className="text-sm text-muted">
                        Mulai {rupiah(fromPrice[m.id])}
                      </p>
                      {bestDeal[m.id] && (
                        <p className="text-sm font-medium text-accent-ink">
                          Diskon {bestDeal[m.id].pct}% ·{" "}
                          {fmtDayChip(bestDeal[m.id].at).top}
                        </p>
                      )}
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
