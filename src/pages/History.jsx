import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { rememberReturn, useAuth } from "../lib/auth";
import { getCodes } from "../lib/booking";
import { cinemaLabel, fmtDate, fmtTime, fmtWhen } from "../lib/config";
import { sortSeats } from "../lib/seats";
import {
  Empty,
  ErrorBox,
  Skeleton,
  Sticker,
  pageTitleCls,
} from "../components/ui";
import { BOOKING_SELECT } from "./Ticket";

const CODE_OK = /^KSK-[A-Z0-9]{6}$/; // kode dari localStorage disaring dulu sebelum masuk ke filter query

export default function History() {
  const { enabled, user, loading: authLoading } = useAuth();

  const {
    data: orders,
    loading,
    error,
    reload,
  } = useAsync(async () => {
    if (authLoading) return null; // tunggu status login dulu supaya tidak memuat dua kali
    const codes = getCodes().filter((c) => CODE_OK.test(c));

    // login: semua pesanan akun ini + pesanan dari browser ini. Tamu: hanya dari browser ini.
    let q = supabase.from("bookings").select(BOOKING_SELECT);
    if (user && codes.length > 0)
      q = q.or(`user_id.eq.${user.id},booking_code.in.(${codes.join(",")})`);
    else if (user) q = q.eq("user_id", user.id);
    else if (codes.length > 0) q = q.in("booking_code", codes);
    else return [];
    const rows = unwrap(await q);

    // satu pesanan = banyak baris kursi; gabungkan per kode booking.
    // Urutan: yang TERAKHIR DIBELI di atas (bukan menurut jam tayang), supaya pesanan yang baru dibayar langsung kelihatan.
    const map = {};
    for (const r of rows) {
      const o = (map[r.booking_code] ||= {
        code: r.booking_code,
        showtime: r.showtimes,
        seats: [],
        boughtAt: r.created_at,
        promo: r.promo_code,
        points: 0,
      });
      o.seats.push(r.seat_code);
      o.points += r.points_used || 0;
    }
    const at = (o) => (o.boughtAt ? Date.parse(o.boughtAt) : 0);
    return Object.values(map).sort(
      (a, b) =>
        at(b) - at(a) ||
        new Date(b.showtime.starts_at) - new Date(a.showtime.starts_at),
    );
  }, [authLoading, user?.id]);

  let content;
  if (error) content = <ErrorBox message={error} onRetry={reload} />;
  else if (authLoading || orders == null)
    content = <Skeleton className="h-40" />;
  else if (orders.length === 0)
    content = (
      <Empty title="Belum ada pesanan">
        <Link to="/" className="font-semibold text-accent-ink underline">
          Pesan tiket pertamamu
        </Link>
      </Empty>
    );
  else
    content = (
      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.code}>
            <Link
              to={`/tiket/${o.code}`}
              className="group flex overflow-hidden nb-card nb-lift"
            >
              <span className="flex w-20 shrink-0 flex-col items-center justify-center bg-accent/10 p-2 text-center sm:w-24">
                <span className="text-[11px] text-muted">Kursi</span>
                <span className="text-lg font-extrabold leading-tight text-accent-ink">
                  {sortSeats(o.seats).join(" ")}
                </span>
              </span>
              <span className="block min-w-0 flex-1 border-l border-line p-4">
                <span className="block text-lg font-bold leading-tight tracking-tight">
                  {o.showtime.movies.title}
                </span>
                {o.showtime.cinemas && (
                  <span className="mt-1 block text-sm font-semibold text-accent-ink">
                    {cinemaLabel(o.showtime)}
                  </span>
                )}
                <span className="mt-1 block text-xs capitalize text-muted">
                  {fmtDate(o.showtime.starts_at)} ·{" "}
                  {fmtTime(o.showtime.starts_at)} · {o.showtime.studio}
                </span>
                <span className="mt-2 block text-sm">
                  Kursi {sortSeats(o.seats).join(", ")} ·{" "}
                  <span className="tnum text-muted">{o.code}</span>
                </span>
                {(o.boughtAt || o.promo || o.points > 0) && (
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                    {o.boughtAt && <span>Dibeli {fmtWhen(o.boughtAt)}</span>}
                    {o.promo && <Sticker>Promo {o.promo}</Sticker>}
                    {o.points > 0 && <Sticker>Poin −{o.points}</Sticker>}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <section>
      <h1 className={pageTitleCls}>Riwayat pesanan</h1>
      <p className="mb-6 mt-3 max-w-3xl text-sm text-muted">
        {user ? (
          "Menampilkan pesanan akunmu, yang terakhir dibeli di paling atas, ditambah tiket lama yang dibuat di browser ini sebelum login diwajibkan."
        ) : (
          <>
            Pemesanan memakai akun, jadi riwayat lengkapmu ada di akun.{" "}
            {enabled && (
              <Link
                to="/masuk"
                onClick={rememberReturn}
                className="font-semibold text-accent-ink underline"
              >
                Masuk
              </Link>
            )}{" "}
            untuk melihatnya. Tiket lama yang tersimpan di browser ini tetap
            tampil di bawah.
          </>
        )}
      </p>
      {content}
    </section>
  );
}
