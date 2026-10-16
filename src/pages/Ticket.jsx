import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { cinemaLabel, fmtDate, fmtTime, rupiah } from "../lib/config";
import { sortSeats } from "../lib/seats";
import { orderTotals } from "../lib/order";
import { usePromoMap } from "../lib/usePromos";
import { Empty, ErrorBox, Skeleton, btnGhost } from "../components/ui";

export const BOOKING_SELECT =
  "booking_code, seat_code, customer_name, promo_code, deal_percent, created_at, showtimes(starts_at, studio, price_regular, price_premium, movies(title), cinemas(name, city))";

export default function Ticket() {
  const { code } = useParams();

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
  const promoCode = rows?.[0]?.promo_code || null;
  const { data: promoMap } = usePromoMap();

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !rows) return <Skeleton className="h-96" />;
  if (!rows || rows.length === 0) {
    return (
      <Empty title="Tiket tidak ditemukan">
        Periksa kembali kode booking kamu.{" "}
        <Link to="/" className="underline">
          Ke beranda
        </Link>
      </Empty>
    );
  }

  if (promoCode && !promoMap) return <Skeleton className="h-96" />;

  const showtime = rows[0].showtimes;
  const seats = sortSeats(rows.map((r) => r.seat_code));
  const promo = promoCode ? promoMap?.[promoCode] || null : null;
  const { dealPercent, dealDiscount, discount, total } = orderTotals(
    seats,
    showtime,
    promo,
    rows[0].deal_percent || 0,
  );

  return (
    <section>
      <p className="mb-4 rounded-lg bg-ok-bg p-3 text-sm text-ok print:hidden">
        Pembayaran simulasi berhasil. Ini e-tiket kamu.
      </p>

      <div className="print-ticket overflow-hidden rounded-2xl border border-line-strong bg-panel">
        <div className="p-5">
          <p className="text-xs uppercase tracking-widest text-accent-ink">
            E-Tiket KursiKu
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {showtime.movies.title}
          </h1>
          {showtime.cinemas && (
            <p className="mt-1 text-sm font-medium text-accent-ink">
              {cinemaLabel(showtime)}
            </p>
          )}
          <p className="mt-1 text-sm capitalize text-muted">
            {fmtDate(showtime.starts_at)} · {fmtTime(showtime.starts_at)} ·{" "}
            {showtime.studio}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-faint">Kursi</dt>
              <dd className="font-semibold">{seats.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-faint">Atas nama</dt>
              <dd className="font-semibold">{rows[0].customer_name}</dd>
            </div>
            <div>
              <dt className="text-faint">Total</dt>
              <dd className="font-semibold">{rupiah(total)}</dd>
              {dealDiscount > 0 && (
                <dd className="text-xs text-muted">
                  Diskon film {dealPercent}% − {rupiah(dealDiscount)}
                </dd>
              )}
              {discount > 0 && (
                <dd className="text-xs text-muted">
                  Promo {promoCode} − {rupiah(discount)}
                </dd>
              )}
              {promoCode && !promo && promoMap && (
                <dd className="text-xs text-muted">Promo {promoCode}</dd>
              )}
            </div>
            <div>
              <dt className="text-faint">Kode booking</dt>
              <dd className="font-mono font-semibold">{code}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col items-center border-t border-dashed border-line-hover p-5">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={code} size={152} />
          </div>
          <p className="mt-2 text-xs text-faint">
            QR berisi kode booking (dummy)
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
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
