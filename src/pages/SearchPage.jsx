import { Link, useSearchParams } from "react-router-dom";
import { useCinema } from "../lib/cinema";
import { useFilms } from "../lib/films";
import { fmtDayChip, fmtWhen, rupiah } from "../lib/config";
import { fmtReleaseShort, untilLabel } from "../lib/release";
import { searchAll } from "../lib/search";
import MovieCard from "../components/MovieCard";
import PageHead from "../components/PageHead";
import { Empty, ErrorBox, SectionTitle, Skeleton } from "../components/ui";
import { GRID } from "./NowShowing";

// Hasil pencarian dari header: film (judul, genre, sutradara, pemeran) dan lokasi (kota, cabang bioskop).
export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get("q") || "").trim();
  const { cinemas } = useCinema();
  const { data, loading, error, reload, next, fromPrice, bestDeal, info } =
    useFilms(null);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36" />
        <div className={GRID}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3]" />
          ))}
        </div>
      </div>
    );
  }

  const res = searchAll(q, data.movies, cinemas);
  const total = res.films.length + res.cinemas.length + res.cities.length;

  return (
    <div className="space-y-10">
      <PageHead
        id="cari-judul"
        title={q ? `Hasil untuk “${q}”` : "Cari film atau lokasi"}
        tone="blue"
        sub={
          q
            ? `${total} hasil: ${res.films.length} film, ${res.cities.length + res.cinemas.length} lokasi`
            : "Ketik judul, genre, sutradara, pemeran, kota, atau nama bioskop di kolom pencarian di atas."
        }
      />

      {q && total === 0 && (
        <Empty title="Tidak ada hasil">
          Coba kata lain, misalnya judul film, “Bandung”, atau “action”.{" "}
          <Link to="/bioskop" className="font-bold text-accent-ink underline">
            Lihat semua bioskop
          </Link>
        </Empty>
      )}

      {res.films.length > 0 && (
        <section aria-labelledby="hasil-film">
          <SectionTitle id="hasil-film">Film</SectionTitle>
          <ul className={GRID}>
            {res.films.map((m) => {
              const d = bestDeal[m.id];
              const inf = info[m.id];
              return (
                <li key={m.id}>
                  {inf.status === "soon" ? (
                    <MovieCard
                      movie={m}
                      tag="soon"
                      left={`Rilis ${fmtReleaseShort(inf.date)}`}
                      right={untilLabel(inf.days)}
                    />
                  ) : next[m.id] ? (
                    <MovieCard
                      movie={m}
                      tag={inf.status === "new" ? "new" : null}
                      deal={
                        d ? { pct: d.pct, day: fmtDayChip(d.at).top } : null
                      }
                      left={fmtWhen(next[m.id])}
                      right={
                        <>
                          <span className="sr-only">Mulai </span>
                          {rupiah(fromPrice[m.id])}
                        </>
                      }
                    />
                  ) : (
                    <MovieCard movie={m} left="Belum ada jadwal" right="" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(res.cities.length > 0 || res.cinemas.length > 0) && (
        <section aria-labelledby="hasil-lokasi">
          <SectionTitle
            id="hasil-lokasi"
            sub="Pilih lokasi untuk melihat cabang KursiKu dan bioskop sungguhan di sana."
          >
            Lokasi
          </SectionTitle>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {res.cities.map((city) => (
              <li key={`k-${city}`}>
                <Link
                  to={`/bioskop?kota=${encodeURIComponent(city)}`}
                  className="nb-card nb-lift block bg-tile-green p-4"
                >
                  <span className="block font-display text-lg font-extrabold leading-tight">
                    Bioskop di {city}
                  </span>
                  <span className="mt-1 block text-sm text-ink-2">
                    Cabang KursiKu dan XXI, CGV, dll.
                  </span>
                </Link>
              </li>
            ))}
            {res.cinemas.map((c) => (
              <li key={`c-${c.id}`}>
                <Link
                  to={`/bioskop?kota=${encodeURIComponent(c.city)}`}
                  className="nb-card nb-lift block bg-panel p-4"
                >
                  <span className="block font-display text-lg font-extrabold leading-tight">
                    {c.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {c.city} · {c.address}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
