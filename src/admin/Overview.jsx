import { useState } from "react";
import { Link } from "react-router-dom";
import { rupiah } from "../lib/config";
import { call, fmtDateTime, fmtShortDate, num } from "../lib/admin";
import { useAsync } from "../lib/useAsync";
import {
  Card,
  ErrorBox,
  FilterSelect,
  Page,
  Skeleton,
  Stat,
  TableWrap,
  td,
  th,
} from "./kit";

const SEATS_PER_STUDIO = 80; // 8 baris x 10 kolom

// Daftar batang mendatar: satu baris per item, lebar batang = bagian dari yang terbesar.
function BarList({ rows, valueOf, labelOf, subOf, fmt }) {
  const max = Math.max(1, ...rows.map(valueOf));
  if (!rows.length)
    return (
      <p className="text-sm text-muted">Belum ada data pada periode ini.</p>
    );
  return (
    <ol className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.movie_id ?? r.cinema_id ?? i}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-bold">{labelOf(r)}</span>
            <span className="shrink-0 font-bold">{fmt(valueOf(r))}</span>
          </div>
          <div
            className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-line-strong bg-raised"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(3, (valueOf(r) / max) * 100)}%` }}
            />
          </div>
          {subOf && <p className="mt-1 text-xs text-muted">{subOf(r)}</p>}
        </li>
      ))}
    </ol>
  );
}

// Grafik batang pendapatan per hari. Isinya juga tersedia sebagai tabel untuk pembaca layar.
function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  const total = daily.reduce((s, d) => s + d.revenue, 0);
  const best = daily.reduce(
    (b, d) => (d.revenue > b.revenue ? d : b),
    daily[0] || { revenue: 0, day: "" },
  );
  return (
    <div>
      <div
        role="img"
        aria-label={`Grafik pendapatan harian selama ${daily.length} hari. Total ${rupiah(total)}. Hari terbaik ${fmtShortDate(best.day)} dengan ${rupiah(best.revenue)}.`}
        className="flex h-48 items-end gap-px rounded-xl border-2 border-line-strong bg-raised/50 p-2 sm:gap-1"
      >
        {daily.map((d) => (
          <div
            key={d.day}
            className="flex h-full min-w-0 flex-1 items-end"
            title={`${fmtShortDate(d.day)}: ${rupiah(d.revenue)} (${d.orders} pesanan)`}
          >
            <div
              className="w-full rounded-t-md border border-edge bg-accent"
              style={{
                height: `${d.revenue ? Math.max(3, (d.revenue / max) * 100) : 1}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div
        className="mt-1.5 flex justify-between text-xs text-muted"
        aria-hidden="true"
      >
        <span>{fmtShortDate(daily[0]?.day)}</span>
        <span>{fmtShortDate(daily[daily.length - 1]?.day)}</span>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-bold">
          Lihat sebagai tabel
        </summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-xl border-2 border-line-strong">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Tanggal</th>
                <th className={th}>Pesanan</th>
                <th className={th}>Tiket</th>
                <th className={th}>Pendapatan</th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.day}>
                  <td className={td}>{fmtShortDate(d.day)}</td>
                  <td className={td}>{d.orders}</td>
                  <td className={td}>{d.tickets}</td>
                  <td className={td}>{rupiah(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export default function Overview() {
  const [days, setDays] = useState("30");
  const { data, loading, error, reload } = useAsync(
    () => call("admin_dashboard", { p_days: Number(days) }),
    [days],
  );

  return (
    <Page
      id="Dashboard"
      title="Dashboard"
      sub="Penjualan dan jadwal tayang KursiKu dalam satu halaman."
      actions={
        <FilterSelect
          id="rentang"
          label="Periode"
          value={days}
          onChange={setDays}
        >
          <option value="7">7 hari terakhir</option>
          <option value="30">30 hari terakhir</option>
          <option value="90">90 hari terakhir</option>
        </FilterSelect>
      }
    >
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Stat
              label="Pendapatan"
              icon="money"
              tone="green"
              value={rupiah(data.totals.revenue)}
              sub={`${days} hari terakhir`}
              className="col-span-2 lg:col-span-1"
            />
            <Stat
              label="Pesanan"
              icon="receipt"
              tone="yellow"
              value={num(data.totals.orders)}
              sub={`${num(data.totals.tickets)} tiket terjual`}
            />
            <Stat
              label="Tiket sudah dipindai"
              icon="scan"
              tone="blue"
              value={num(data.totals.checked_in)}
              sub={
                data.totals.orders
                  ? `${Math.round((data.totals.checked_in / data.totals.orders) * 100)}% dari pesanan`
                  : "Belum ada pesanan"
              }
            />
            <Stat
              label="Tayang hari ini"
              icon="calendar"
              tone="lilac"
              value={`${data.today.showtimes} jadwal`}
              sub={
                data.today.showtimes
                  ? `${data.today.sold} dari ${data.today.showtimes * SEATS_PER_STUDIO} kursi terisi`
                  : "Tidak ada jadwal"
              }
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <Card
              title="Pendapatan per hari"
              sub={`${days} hari terakhir`}
              className="lg:col-span-2"
            >
              <DailyChart daily={data.daily} />
            </Card>
            <Card
              title="Rincian potongan"
              sub="Dari harga normal sampai yang dibayar pembeli"
            >
              <dl className="space-y-2.5 text-sm">
                {[
                  ["Harga normal", data.totals.gross],
                  ["Diskon film harian", -data.totals.deal_discount],
                  ["Kode promo", -data.totals.promo_discount],
                  ["Tukar poin", -data.totals.points_discount],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="font-bold">
                      {v < 0 ? `−${rupiah(-v)}` : rupiah(v)}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 border-t-2 border-line-strong pt-2.5">
                  <dt className="font-bold">Dibayar pembeli</dt>
                  <dd className="font-extrabold">
                    {rupiah(data.totals.revenue)}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl bg-raised/60 p-3 text-xs text-muted">
                Keterisian 7 hari ke depan:{" "}
                <b className="text-ink">
                  {data.occupancy.capacity
                    ? Math.round(
                        (data.occupancy.sold / data.occupancy.capacity) * 100,
                      )
                    : 0}
                  %
                </b>{" "}
                ({num(data.occupancy.sold)} dari {num(data.occupancy.capacity)}{" "}
                kursi di {data.occupancy.showtimes} jadwal).
              </p>
            </Card>
          </div>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Card title="Film terlaris" sub="Berdasarkan jumlah tiket">
              <BarList
                rows={data.top_movies}
                valueOf={(r) => r.tickets}
                labelOf={(r) => r.title}
                subOf={(r) => rupiah(r.revenue)}
                fmt={(v) => `${v} tiket`}
              />
            </Card>
            <Card
              title="Pendapatan per bioskop"
              sub="Berdasarkan total dibayar"
            >
              <BarList
                rows={data.by_cinema}
                valueOf={(r) => r.revenue}
                labelOf={(r) => r.name}
                subOf={(r) => `${r.orders} pesanan, ${r.tickets} tiket`}
                fmt={rupiah}
              />
            </Card>
          </div>

          <section aria-labelledby="pesanan-terbaru">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2
                id="pesanan-terbaru"
                className="text-lg font-extrabold tracking-tight"
              >
                Pesanan terbaru
              </h2>
              <Link to="/admin/pesanan" className="text-sm font-bold underline">
                Semua pesanan
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted">Belum ada pesanan.</p>
            ) : (
              <TableWrap label="Daftar pesanan terbaru">
                <table className="w-full min-w-[34rem]">
                  <thead>
                    <tr>
                      <th className={th}>Kode</th>
                      <th className={th}>Pembeli</th>
                      <th className={th}>Film</th>
                      <th className={th}>Kursi</th>
                      <th className={th}>Total</th>
                      <th className={th}>Dipesan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r) => (
                      <tr key={r.booking_code}>
                        <td className={`${td} whitespace-nowrap`}>
                          <Link
                            to={`/admin/pesanan?q=${r.booking_code}`}
                            className="font-bold underline"
                          >
                            {r.booking_code}
                          </Link>
                        </td>
                        <td className={td}>{r.customer_name}</td>
                        <td className={td}>{r.movie_title}</td>
                        <td className={td}>{r.n_seats}</td>
                        <td className={td}>{rupiah(r.total)}</td>
                        <td className={`${td} whitespace-nowrap`}>
                          {fmtDateTime(r.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            )}
          </section>

          <p className="text-xs text-muted">
            Sepanjang waktu: {num(data.all_time.orders)} pesanan,{" "}
            {rupiah(data.all_time.revenue)} pendapatan,{" "}
            {num(data.all_time.users)} akun terdaftar (
            {num(data.all_time.buyers)} pernah membeli), {data.all_time.movies}{" "}
            film, {data.all_time.cinemas} bioskop. Pembayaran di KursiKu adalah
            simulasi, jadi angka ini bukan uang sungguhan.
          </p>
        </div>
      )}
    </Page>
  );
}
