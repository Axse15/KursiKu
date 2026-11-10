import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { rememberReturn, useAuth } from "../lib/auth";
import { getCodes } from "../lib/booking";
import { cinemaLabel, fmtDate, fmtTime, fmtWhen } from "../lib/config";
import { sortSeats } from "../lib/seats";
import {
  Chip,
  Empty,
  ErrorBox,
  Skeleton,
  Sticker,
  pageTitleCls,
} from "../components/ui";
import { SCAN_EVENT } from "../components/ScanNotifier";
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
    const scope = (q) => {
      if (user && codes.length > 0)
        return q.or(
          `user_id.eq.${user.id},booking_code.in.(${codes.join(",")})`,
        );
      if (user) return q.eq("user_id", user.id);
      return q.in("booking_code", codes);
    };
    if (!user && codes.length === 0) return [];
    const rows = unwrap(
      await scope(supabase.from("bookings").select(BOOKING_SELECT)),
    );

    // Tiket yang sudah dipindai di pintu masuk. Kolom checked_in_at baru ada setelah supabase-v12.sql, jadi dibaca terpisah
    // dan kegagalannya diabaikan (riwayat tetap tampil, hanya tanpa tanda).
    const scanned = {};
    try {
      const r = await scope(
        supabase
          .from("bookings")
          .select("booking_code, checked_in_at")
          .not("checked_in_at", "is", null),
      );
      if (!r.error)
        for (const x of r.data || []) scanned[x.booking_code] = x.checked_in_at;
    } catch {
      /* abaikan */
    }

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
        scannedAt: scanned[r.booking_code] || null,
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

  // Pembaruan langsung dari ScanNotifier (Realtime): tanda muncul tanpa muat ulang saat petugas memindai tiket.
  const [live, setLive] = useState({});
  useEffect(() => {
    const onScan = (e) =>
      e.detail?.code &&
      setLive((l) => ({ ...l, [e.detail.code]: e.detail.at }));
    window.addEventListener(SCAN_EVENT, onScan);
    return () => window.removeEventListener(SCAN_EVENT, onScan);
  }, []);
  const scannedOf = (o) => (o.code in live ? live[o.code] : o.scannedAt);

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
      <ul className="grid gap-4 lg:grid-cols-2">
        {orders.map((o) => (
          <li key={o.code}>
            <Link
              to={`/tiket/${o.code}`}
              className="group flex h-full overflow-hidden nb-card nb-lift"
            >
              <span className="flex w-20 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-edge bg-tile-yellow p-2 text-center sm:w-24">
                <span className="text-[11px] text-ink-2">Kursi</span>
                <span className="font-display text-lg font-extrabold leading-tight">
                  {sortSeats(o.seats).join(" ")}
                </span>
              </span>
              <span className="block min-w-0 flex-1 p-4">
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
                {(o.boughtAt || o.promo || o.points > 0 || scannedOf(o)) && (
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                    {scannedOf(o) && (
                      <Chip tone="green" title="Sudah dipindai di pintu masuk">
                        Sudah dipindai
                      </Chip>
                    )}
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
