import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useCinema } from "../lib/cinema";
import { fmtDate, fmtDayChip, fmtTime, rupiah } from "../lib/config";
import { promoTerms } from "../lib/promo";
import { releaseInfo } from "../lib/release";
import { collectSaleFilms } from "../lib/saleFilms";
import { usePromos } from "../lib/usePromos";
import MovieCard from "../components/MovieCard";
import { Empty, ErrorBox, Skeleton, btnPrimary } from "../components/ui";

const WINDOW_MS = 3 * 86400000; // sama dengan beranda: 3 hari ke depan
const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-5";

// Film yang sedang diskon dalam 3 hari ke depan, dikelompokkan per hari.
// Jadwal diambil per halaman 1000 baris (batas Supabase) supaya tidak ada film yang terlewat.
function useSaleFilms() {
  return useAsync(async () => {
    const now = Date.now();
    const PAGE = 1000;
    const shows = [];
    for (let from = 0; from < 5 * PAGE; from += PAGE) {
      const part = unwrap(
        await supabase
          .from("showtimes")
          .select("movie_id, cinema_id, starts_at, price_regular")
          .gte("starts_at", new Date(now).toISOString())
          .lt("starts_at", new Date(now + WINDOW_MS).toISOString())
          .order("starts_at")
          .order("id")
          .range(from, from + PAGE - 1),
      );
      shows.push(...part);
      if (part.length < PAGE) break;
    }
    const groups = collectSaleFilms(shows, now);
    if (groups.length === 0) return { groups: [], movies: {} };
    const ids = [
      ...new Set(groups.flatMap((g) => g.items.map((i) => i.movieId))),
    ];
    const rows = unwrap(
      await supabase.from("movies").select("*").in("id", ids),
    );
    const movies = Object.fromEntries(
      rows
        .filter((m) => releaseInfo(m).status !== "soon")
        .map((m) => [m.id, m]),
    );
    return { groups, movies };
  }, []);
}

export default function Promo() {
  const { cinemas, loading: cinemaLoading, error: cinemaError } = useCinema();
  const { data: promos, loading, error } = usePromos();
  const sale = useSaleFilms();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold">Harga & promo</h1>
        <p className="mt-1 text-muted">
          Semua harga dan promo di sini fiktif. Tidak ada uang sungguhan yang
          diproses.
        </p>
      </div>

      <section aria-labelledby="film-diskon-judul">
        <h2 id="film-diskon-judul" className="font-display text-xl font-bold">
          Film yang lagi promo
        </h2>
        <p className="mt-1 text-sm text-muted">
          Diskon film berganti setiap hari dan berlaku otomatis, tanpa kode.
          Harga di bawah sudah termasuk potongan.
        </p>
        {sale.error ? (
          <div className="mt-3">
            <ErrorBox
              message={`Film promo gagal dimuat: ${sale.error}`}
              onRetry={sale.reload}
            />
          </div>
        ) : sale.loading && !sale.data ? (
          <Skeleton className="mt-3 h-64" />
        ) : (
          (() => {
            const { groups, movies } = sale.data;
            const visible = groups
              .map((g) => ({
                ...g,
                items: g.items.filter((it) => movies[it.movieId]),
              }))
              .filter((g) => g.items.length > 0);
            if (visible.length === 0) {
              return (
                <div className="mt-3">
                  <Empty title="Belum ada film diskon dalam 3 hari ke depan">
                    <Link to="/" className="underline">
                      Lihat semua film
                    </Link>
                  </Empty>
                </div>
              );
            }
            return (
              <div className="mt-4 space-y-8">
                {visible.map((g) => {
                  const chip = fmtDayChip(g.at);
                  return (
                    <div key={g.day}>
                      <h3 className="mb-3 font-display text-lg font-semibold">
                        {chip.top === "Hari ini" || chip.top === "Besok"
                          ? `${chip.top} · `
                          : ""}
                        {fmtDate(g.at)}
                        <span className="ml-2 text-sm font-normal text-muted">
                          {g.items.length} film
                        </span>
                      </h3>
                      <ul className={GRID}>
                        {g.items.map((it) => (
                          <li key={it.movieId}>
                            <MovieCard
                              movie={movies[it.movieId]}
                              deal={{ pct: it.pct, day: chip.top }}
                              left={`${it.cinemas.size} bioskop · ${fmtTime(it.first)}`}
                              right={
                                <>
                                  <span className="sr-only">
                                    Harga normal {rupiah(it.regular)}, jadi{" "}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="mr-1 font-normal text-faint line-through"
                                  >
                                    {rupiah(it.regular)}
                                  </span>
                                  {rupiah(it.price)}
                                </>
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </section>

      <section aria-labelledby="harga-judul">
        <h2 id="harga-judul" className="font-display text-xl font-bold">
          Daftar harga tiket
        </h2>
        {cinemaError ? (
          <div className="mt-3">
            <ErrorBox message={cinemaError} />
          </div>
        ) : cinemaLoading && cinemas.length === 0 ? (
          <Skeleton className="mt-3 h-40" />
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <caption className="sr-only">Harga tiket per bioskop</caption>
              <thead className="bg-raised text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Bioskop
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Reguler (A–E)
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Premium (F–H)
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Sabtu & Minggu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cinemas.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      {c.name}
                      <span className="block text-xs font-normal text-faint">
                        {c.city}
                      </span>
                    </th>
                    <td className="px-4 py-3">{rupiah(c.price_regular)}</td>
                    <td className="px-4 py-3">{rupiah(c.price_premium)}</td>
                    <td className="px-4 py-3 text-muted">
                      + {rupiah(10000)} per kursi
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-faint">
          Harga per kursi. Jadwal yang sudah punya pesanan tidak berubah
          harganya, jadi total tiket yang sudah dibeli tetap sama.
        </p>
      </section>

      <section aria-labelledby="promo-judul">
        <h2 id="promo-judul" className="font-display text-xl font-bold">
          Kode promo hari ini
        </h2>
        <p className="mt-1 text-sm text-muted">
          Kode hanya muncul di hari-hari tertentu dan berlaku sampai pukul 23.59
          WIB. Setiap kode hanya bisa dipakai sekali per akun; setelah dipakai,
          kode hilang dari daftar ini.
        </p>
        {error ? (
          <div className="mt-3">
            <ErrorBox
              message={`Kode promo gagal dimuat: ${error}. Pastikan file supabase-v8.sql sudah dijalankan.`}
            />
          </div>
        ) : loading ? (
          <Skeleton className="mt-3 h-40" />
        ) : promos.length === 0 ? (
          <div className="mt-3">
            <Empty title="Tidak ada kode promo yang bisa dipakai hari ini">
              Belum ada kode yang terbuka, atau semuanya sudah kamu pakai. Cek
              lagi besok.
            </Empty>
          </div>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {promos.map((p) => (
              <li
                key={p.code}
                className="rounded-2xl border border-line bg-panel p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold">{p.title}</p>
                    <p className="mt-1 text-sm text-muted">{p.description}</p>
                  </div>
                  <p className="font-display text-3xl font-bold text-accent-ink">
                    {p.percent_off}%
                  </p>
                </div>
                <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                  {promoTerms(p).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>
                    Kode:{" "}
                    <span className="rounded bg-raised px-2 py-1 font-mono text-ink">
                      {p.code}
                    </span>
                  </span>
                  <span className="text-xs text-faint">Sekali pakai</span>
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">
          Cara pakai: pilih kursi, lalu ketik kodenya di halaman bayar. Satu
          pesanan hanya bisa memakai satu kode, dan kode baru terpakai kalau
          pembayarannya berhasil.
        </p>
        <Link to="/" className={`${btnPrimary} mt-4`}>
          Cari film sekarang
        </Link>
      </section>
    </div>
  );
}
