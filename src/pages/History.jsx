import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { getCodes } from "../lib/booking";
import { fmtDate, fmtTime } from "../lib/config";
import { sortSeats } from "../lib/seats";
import { Empty, ErrorBox, Skeleton } from "../components/ui";
import { BOOKING_SELECT } from "./Ticket";

export default function History() {
  const {
    data: orders,
    loading,
    error,
    reload,
  } = useAsync(async () => {
    const codes = getCodes();
    if (codes.length === 0) return [];
    const rows = unwrap(
      await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .in("booking_code", codes),
    );

    // satu pesanan = banyak baris kursi; gabungkan per kode booking
    const map = {};
    for (const r of rows) {
      (map[r.booking_code] ||= {
        code: r.booking_code,
        showtime: r.showtimes,
        seats: [],
      }).seats.push(r.seat_code);
    }
    return codes.filter((c) => map[c]).map((c) => map[c]);
  }, []);

  let content;
  if (error) content = <ErrorBox message={error} onRetry={reload} />;
  else if (loading && !orders) content = <Skeleton className="h-40" />;
  else if (orders.length === 0)
    content = (
      <Empty title="Belum ada pesanan">
        Riwayat disimpan di browser ini.{" "}
        <Link to="/" className="underline">
          Pesan tiket pertamamu
        </Link>
      </Empty>
    );
  else
    content = (
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.code}>
            <Link
              to={`/tiket/${o.code}`}
              className="block rounded-xl border border-zinc-800 p-4 hover:border-amber-400"
            >
              <p className="font-display text-lg font-semibold">
                {o.showtime.movies.title}
              </p>
              <p className="mt-1 text-sm capitalize text-zinc-400">
                {fmtDate(o.showtime.starts_at)} ·{" "}
                {fmtTime(o.showtime.starts_at)} · {o.showtime.studio}
              </p>
              <p className="mt-2 text-sm">
                Kursi {sortSeats(o.seats).join(", ")} ·{" "}
                <span className="font-mono text-zinc-400">{o.code}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <section>
      <h1 className="mb-4 font-display text-2xl font-bold">Riwayat pesanan</h1>
      {content}
    </section>
  );
}
