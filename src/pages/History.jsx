import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../lib/auth";
import { getCodes } from "../lib/booking";
import { cinemaLabel, fmtDate, fmtTime, fmtWhen } from "../lib/config";
import { sortSeats } from "../lib/seats";
import { Empty, ErrorBox, Skeleton } from "../components/ui";
import { BOOKING_SELECT } from "./Ticket";

const CODE_OK = /^KSK-[A-Z0-9]{6}$/; // kode dari localStorage disaring dulu sebelum masuk ke filter query

export default function History() {
  const { enabled, user, loading: authLoading, signIn } = useAuth();

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
      (map[r.booking_code] ||= {
        code: r.booking_code,
        showtime: r.showtimes,
        seats: [],
        boughtAt: r.created_at,
        promo: r.promo_code,
      }).seats.push(r.seat_code);
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
              className="block rounded-xl border border-line p-4 hover:border-accent"
            >
              <p className="font-display text-lg font-semibold">
                {o.showtime.movies.title}
              </p>
              {o.showtime.cinemas && (
                <p className="mt-1 text-sm text-accent-ink">
                  {cinemaLabel(o.showtime)}
                </p>
              )}
              <p className="mt-1 text-sm capitalize text-muted">
                {fmtDate(o.showtime.starts_at)} ·{" "}
                {fmtTime(o.showtime.starts_at)} · {o.showtime.studio}
              </p>
              <p className="mt-2 text-sm">
                Kursi {sortSeats(o.seats).join(", ")} ·{" "}
                <span className="font-mono text-muted">{o.code}</span>
              </p>
              {(o.boughtAt || o.promo) && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                  {o.boughtAt && <span>Dibeli {fmtWhen(o.boughtAt)}</span>}
                  {o.promo && (
                    <span className="rounded bg-raised px-1.5 py-0.5 font-mono text-ink-2">
                      Promo {o.promo}
                    </span>
                  )}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <section>
      <h1 className="mb-2 font-display text-2xl font-bold">Riwayat pesanan</h1>
      <p className="mb-4 text-sm text-muted">
        {user ? (
          "Menampilkan pesanan akun Google kamu, yang terakhir dibeli di paling atas, ditambah tiket lama yang dibuat di browser ini sebelum login diwajibkan."
        ) : (
          <>
            Pemesanan sekarang memakai akun Google, jadi riwayat lengkapmu ada
            di akun.{" "}
            {enabled && (
              <button
                type="button"
                onClick={signIn}
                className="text-accent-ink underline"
              >
                Masuk dengan Google
              </button>
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
