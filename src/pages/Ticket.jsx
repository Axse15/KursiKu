import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { cinemaLabel, fmtDate, fmtTime, rupiah } from "../lib/config";
import { sortSeats } from "../lib/seats";
import { orderTotals } from "../lib/order";
import { usePromoMap } from "../lib/usePromos";
import { Empty, ErrorBox, Skeleton, btnGhost } from "../components/ui";
import { SCAN_EVENT } from "../components/ScanNotifier";

const fmtScan = (iso) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

export const BOOKING_SELECT =
  "booking_code, seat_code, customer_name, promo_code, deal_percent, points_used, created_at, showtimes(starts_at, studio, price_regular, price_premium, movies(title), cinemas(name, city))";

export default function Ticket() {
  const { code } = useParams();
  const fromCheckout = useLocation().state; // hanya dikirim Checkout sesaat setelah bayar
  const justPaid = fromCheckout?.earned !== undefined;
  const earned = fromCheckout?.earned || 0;

  const {
    data: rows,
    loading,
    error,
    reload,
  } = useAsync(
    async () =>
      unwrap(
        await supabase
          .from("bookings")
          .select(BOOKING_SELECT)
          .eq("booking_code", code),
      ),
    [code],
  );
  // Kolom checked_in_at baru ada setelah supabase-v12.sql dijalankan. Dibaca terpisah dan kegagalannya diabaikan,
  // supaya tiket tetap tampil di database yang belum punya kolom itu.
  const { data: fetchedScan } = useAsync(async () => {
    // validasi menandai semua baris kursi satu pesanan sekaligus, jadi cukup membaca satu baris
    const r = await supabase
      .from("bookings")
      .select("checked_in_at")
      .eq("booking_code", code)
      .limit(1);
    return r.error ? null : r.data?.[0]?.checked_in_at || null;
  }, [code]);
  // Pembaruan langsung: ScanNotifier (Realtime) mengirim kejadian saat petugas memindai atau membatalkan validasi tiket ini.
  const [live, setLive] = useState(null);
  useEffect(() => {
    setLive(null);
    const onScan = (e) =>
      e.detail?.code === code && setLive({ code, at: e.detail.at });
    window.addEventListener(SCAN_EVENT, onScan);
    return () => window.removeEventListener(SCAN_EVENT, onScan);
  }, [code]);
  const scanned = live ? live.at : fetchedScan;
  const promoCode = rows?.[0]?.promo_code || null;
  const { data: promoMap } = usePromoMap();

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !rows) return <Skeleton className="h-96" />;
  if (!rows || rows.length === 0) {
    return (
      <Empty title="Tiket tidak ditemukan">
        Periksa kembali kode booking kamu.{" "}
        <Link to="/" className="font-semibold text-accent-ink underline">
          Ke beranda
        </Link>
      </Empty>
    );
  }

  if (promoCode && !promoMap) return <Skeleton className="h-96" />; // tunggu data promo supaya total tidak sempat tampil tanpa potongan

  const showtime = rows[0].showtimes;
  const seats = sortSeats(rows.map((r) => r.seat_code));
  const promo = promoCode ? promoMap?.[promoCode] || null : null;
  const pointsUsed = rows.reduce((sum, r) => sum + (r.points_used || 0), 0); // dicatat di baris kursi pertama
  const { dealPercent, dealDiscount, discount, pointsDiscount, total } =
    orderTotals(seats, showtime, promo, rows[0].deal_percent || 0, pointsUsed);

  return (
    <section>
      {justPaid && (
        <p
          role="status"
          className="mx-auto mb-6 max-w-3xl rounded-xl border-2 border-ok/40 bg-ok-bg p-3 text-sm font-medium text-ok print:hidden"
        >
          Pembayaran simulasi berhasil. Ini e-tiket kamu.
          {earned > 0 && (
            <>
              {" "}
              Kamu dapat <strong className="tnum">+{earned} poin</strong>.
            </>
          )}
        </p>
      )}
      {scanned && (
        <p
          role="status"
          className="mx-auto mb-6 max-w-3xl rounded-xl border-2 border-edge bg-tile-lilac p-3 text-sm font-bold text-ink print:hidden"
        >
          Tiket ini sudah dipindai di pintu masuk pada {fmtScan(scanned)}. Kode
          yang sama tidak bisa dipakai masuk lagi.
        </p>
      )}

      <div className="print-ticket mx-auto max-w-3xl overflow-hidden nb-card md:flex">
        <div className="p-6 md:flex-1 md:p-8">
          <p className="text-sm font-semibold text-accent-ink">
            E-Tiket KursiKu
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {showtime.movies.title}
          </h1>
          {showtime.cinemas && (
            <p className="mt-3 font-semibold">{cinemaLabel(showtime)}</p>
          )}
          <p className="mt-1 text-sm capitalize text-muted">
            {fmtDate(showtime.starts_at)} · {fmtTime(showtime.starts_at)} ·{" "}
            {showtime.studio}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t-2 border-dashed border-edge/40 pt-5 text-sm">
            <div>
              <dt className="text-xs text-muted">Kursi</dt>
              <dd className="text-2xl font-extrabold leading-tight text-accent-ink">
                {seats.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Atas nama</dt>
              <dd className="text-lg font-semibold">{rows[0].customer_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total</dt>
              <dd className="tnum text-lg font-semibold">{rupiah(total)}</dd>
              {dealDiscount > 0 && (
                <dd className="tnum text-xs text-muted">
                  Diskon film {dealPercent}% − {rupiah(dealDiscount)}
                </dd>
              )}
              {discount > 0 && (
                <dd className="tnum text-xs text-muted">
                  Promo {promoCode} − {rupiah(discount)}
                </dd>
              )}
              {pointsDiscount > 0 && (
                <dd className="tnum text-xs text-muted">
                  Poin {pointsUsed} − {rupiah(pointsDiscount)}
                </dd>
              )}
              {promoCode && !promo && promoMap && (
                <dd className="text-xs text-muted">Promo {promoCode}</dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-muted">Kode booking</dt>
              <dd className="tnum text-lg font-semibold tracking-wide">
                {code}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col items-center justify-center border-t-2 border-dashed border-edge bg-tile-yellow p-6 md:w-56 md:shrink-0 md:border-l-2 md:border-t-0">
          <div className="rounded-xl border-2 border-edge bg-white p-3 shadow-nb">
            <QRCodeSVG value={code} size={136} />
          </div>
          <p className="mt-3 text-center text-xs text-ink-2">
            QR berisi kode booking (dummy)
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className={btnGhost}
        >
          Cetak / simpan PDF
        </button>
        <Link to="/" className={btnGhost}>
          Pesan lagi
        </Link>
        <Link to="/riwayat" className={btnGhost}>
          Riwayat pesanan
        </Link>
      </div>
    </section>
  );
}
