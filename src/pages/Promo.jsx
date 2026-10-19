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
import PageHead from "../components/PageHead";
import {
  Empty,
  ErrorBox,
  SectionTitle,
  Skeleton,
  btnPrimary,
} from "../components/ui";

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
      <PageHead
        id="promo-halaman-judul"
        title="Harga & promo"
        tone="pink"
        sub="Semua harga dan promo di sini fiktif. Tidak ada uang sungguhan yang diproses."
      />

      <section aria-labelledby="film-diskon-judul">
        <SectionTitle
          id="film-diskon-judul"
          sub="Diskon film berganti setiap hari dan berlaku otomatis, tanpa kode. Harga di bawah sudah termasuk potongan."
        >
          Film yang lagi promo
        </SectionTitle>
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
                    <Link
                      to="/"
                      className="font-semibold text-accent-ink underline"
                    >
                      Lihat semua film
                    </Link>
                  </Empty>
                </div>
              );
            }
            return (
              <div className="space-y-10">
                {visible.map((g) => {
                  const chip = fmtDayChip(g.at);
                  return (
                    <div key={g.day}>
                      <h3 className="mb-4 text-lg font-bold tracking-tight">
                        {chip.top === "Hari ini" || chip.top === "Besok"
                          ? `${chip.top} · `
                          : ""}
                        {fmtDate(g.at)}
                        <span className="ml-3 text-sm font-normal text-muted">
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
        <SectionTitle id="harga-judul">Daftar harga tiket</SectionTitle>
        {cinemaError ? (
          <div className="mt-3">
            <ErrorBox message={cinemaError} />
          </div>
        ) : cinemaLoading && cinemas.length === 0 ? (
          <Skeleton className="mt-3 h-40" />
        ) : (
          <div className="overflow-x-auto nb-card">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <caption className="sr-only">Harga tiket per bioskop</caption>
              <thead className="bg-raised text-ink-2">
                <tr>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Bioskop
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Reguler (A–E)
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Premium (F–H)
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">
                    Sabtu & Minggu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cinemas.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" className="px-4 py-3 font-semibold">
                      {c.name}
                      <span className="block text-xs font-normal text-faint">
                        {c.city}
                      </span>
                    </th>
                    <td className="tnum px-4 py-3">
                      {rupiah(c.price_regular)}
                    </td>
                    <td className="tnum px-4 py-3">
                      {rupiah(c.price_premium)}
                    </td>
                    <td className="tnum px-4 py-3 text-muted">
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
        <SectionTitle
          id="promo-judul"
          sub="Kode hanya muncul di hari-hari tertentu dan berlaku sampai pukul 23.59 WIB. Setiap kode hanya bisa dipakai sekali per akun; setelah dipakai, kode hilang dari daftar ini."
        >
          Kode promo hari ini
        </SectionTitle>
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
          <ul className="mt-3 grid gap-5 sm:grid-cols-2">
            {promos.map((p) => (
              <li key={p.code} className="flex overflow-hidden nb-card">
                <div className="flex w-28 shrink-0 flex-col items-center justify-center bg-accent/10 p-3 text-center">
                  <p className="text-4xl font-extrabold leading-none text-accent-ink">
                    {p.percent_off}%
                  </p>
                  <p className="mt-1 text-xs text-muted">potongan</p>
                </div>
                <div className="min-w-0 flex-1 border-l border-line p-4">
                  <p className="text-lg font-bold leading-tight tracking-tight">
                    {p.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{p.description}</p>
                  <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                    {promoTerms(p).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span>
                      Kode:{" "}
                      <span className="rounded-md border border-dashed border-accent-ink bg-raised px-2 py-1 font-semibold tracking-wider text-ink">
                        {p.code}
                      </span>
                    </span>
                    <span className="text-xs text-faint">Sekali pakai</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted">
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
