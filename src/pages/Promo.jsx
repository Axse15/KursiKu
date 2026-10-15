import { Link } from "react-router-dom";
import { useCinema } from "../lib/cinema";
import { rupiah } from "../lib/config";
import { promoTerms } from "../lib/promo";
import { usePromos } from "../lib/usePromos";
import { Empty, ErrorBox, Skeleton, btnPrimary } from "../components/ui";

export default function Promo() {
  const { cinemas, loading: cinemaLoading, error: cinemaError } = useCinema();
  const { data: promos, loading, error } = usePromos();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold">Harga & promo</h1>
        <p className="mt-1 text-muted">
          Semua harga dan promo di sini fiktif. Tidak ada uang sungguhan yang
          diproses.
        </p>
      </div>

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
          Promo yang berlaku
        </h2>
        {error ? (
          <div className="mt-3">
            <ErrorBox
              message={`Promo gagal dimuat: ${error}. Pastikan file supabase-v4.sql sudah dijalankan.`}
            />
          </div>
        ) : loading ? (
          <Skeleton className="mt-3 h-40" />
        ) : promos.length === 0 ? (
          <div className="mt-3">
            <Empty title="Belum ada promo">Cek lagi nanti.</Empty>
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
                <p className="mt-4 text-sm text-muted">
                  Kode:{" "}
                  <span className="rounded bg-raised px-2 py-1 font-mono text-ink">
                    {p.code}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">
          Cara pakai: pilih kursi, lalu ketik kodenya di halaman bayar. Satu
          pesanan hanya bisa memakai satu kode.
        </p>
        <Link to="/" className={`${btnPrimary} mt-4`}>
          Cari film sekarang
        </Link>
      </section>
    </div>
  );
}
