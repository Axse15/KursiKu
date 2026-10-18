import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { rupiah } from "../lib/config";
import { BANKS, fmtCountdown, fmtVa, qrPayload } from "../lib/payment";
import { btnGhost, btnPrimary } from "./ui";

// Langkah pembayaran: QR untuk QRIS/e-wallet, nomor virtual account untuk transfer bank, dengan hitung mundur.
// QRIS dan e-wallet: pembayaran terdeteksi sendiri setelah 10-20 detik (payment.paidAt), lalu onPaid dipanggil otomatis.
// Transfer bank: pengguna menekan "Saya sudah transfer". Tidak ada pengecekan ke bank sungguhan.
export default function PaymentPanel({
  method,
  payment,
  paying,
  error,
  onPaid,
  onBack,
  onRenew,
}) {
  const [now, setNow] = useState(() => Date.now());
  const [bank, setBank] = useState(BANKS[0]);
  const [copied, setCopied] = useState(false);
  const paidRef = useRef(onPaid); // selalu memanggil versi terbaru onPaid
  paidRef.current = onPaid;
  const firedFor = useRef(null); // referensi pembayaran yang sudah memicu bayar otomatis (supaya tidak terpicu dua kali)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // kode baru dibuat: hitung mundur langsung mulai dari 10:00, tanpa menunggu detik berikutnya
  useEffect(() => setNow(Date.now()), [payment.expiresAt]);

  const left = payment.expiresAt - now;
  const expired = left <= 0;
  const isBank = method.id === "bank";
  const isQr = !isBank;

  // QRIS / e-wallet: setelah jeda acak, pembayaran dianggap masuk
  useEffect(() => {
    if (!isQr || firedFor.current === payment.ref) return undefined;
    const t = setTimeout(
      () => {
        if (Date.now() >= payment.expiresAt) return; // sudah kedaluwarsa: pengguna harus membuat kode baru
        firedFor.current = payment.ref;
        paidRef.current();
      },
      Math.max(0, payment.paidAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [isQr, payment.ref, payment.paidAt, payment.expiresAt]);

  async function copyVa() {
    try {
      await navigator.clipboard.writeText(payment.va);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* browser memblokir salin otomatis: nomornya tetap bisa disalin manual */
    }
  }

  return (
    <section
      aria-labelledby="bayar-judul"
      className="nb-card bg-tile-yellow p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="bayar-judul"
            className="text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            {isBank
              ? "Transfer ke virtual account"
              : method.id === "ewallet"
                ? "Bayar dengan e-wallet"
                : "Bayar dengan QRIS"}
          </h2>
          <p className="mt-1 text-sm text-ink-2">{method.label}</p>
        </div>
        <p
          role="timer"
          aria-label={
            expired
              ? "Waktu bayar habis"
              : `Sisa waktu bayar ${fmtCountdown(left)}`
          }
          className={`tnum rounded-xl border-2 border-edge px-3 py-1.5 font-display text-xl font-extrabold sm:text-2xl ${expired ? "bg-danger-bg text-danger" : "bg-panel"}`}
        >
          {expired ? "Habis" : fmtCountdown(left)}
        </p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8">
        {isQr ? (
          <div className="mx-auto w-full max-w-[14rem] md:mx-0 md:max-w-[16rem]">
            <div
              className={`rounded-2xl border-2 border-edge bg-white p-3 shadow-nb transition-opacity ${expired || paying ? "opacity-40" : ""}`}
            >
              <QRCodeSVG
                value={qrPayload(payment)}
                size={208}
                level="M"
                bgColor="#ffffff"
                fgColor="#14122b"
                role="img"
                title={`Kode QR pembayaran ${payment.ref}`}
                data-testid="payment-qr"
                className="block h-auto w-full"
              />
            </div>
            <p className="mt-2 text-center text-xs font-bold text-ink-2">
              KursiKu
            </p>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-sm space-y-3 md:mx-0 md:w-72 md:max-w-none">
            <div>
              <label htmlFor="bank" className="text-xs font-bold text-ink-2">
                Pilih bank
              </label>
              <select
                id="bank"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-edge bg-panel px-3 text-sm text-ink"
              >
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-2xl border-2 border-edge bg-panel p-4 shadow-nb">
              <p className="text-xs font-bold text-muted">
                Nomor virtual account {bank}
              </p>
              <p
                className="tnum mt-1 break-all font-display text-2xl font-extrabold tracking-wide"
                data-testid="payment-va"
              >
                {fmtVa(payment.va)}
              </p>
              <button
                type="button"
                onClick={copyVa}
                className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-accent-ink underline"
              >
                {copied ? "Tersalin ✓" : "Salin nomor"}
              </button>
            </div>
          </div>
        )}

        <dl className="text-sm">
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-edge/20 py-2">
            <dt className="text-ink-2">Total bayar</dt>
            <dd className="tnum text-xl font-extrabold">
              {rupiah(payment.amount)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-b-2 border-edge/20 py-2">
            <dt className="text-ink-2">Nomor referensi</dt>
            <dd className="tnum font-bold" data-testid="payment-ref">
              {payment.ref}
            </dd>
          </div>
          <div className="py-2">
            <dt className="sr-only">Cara bayar</dt>
            <dd className="text-ink-2">
              {isBank
                ? `Buka aplikasi ${bank}, pilih transfer ke virtual account, masukkan nomor virtual account ini, lalu bayar tepat sesuai total.`
                : method.id === "ewallet"
                  ? "Buka aplikasi e-wallet, pilih Scan/Bayar, lalu pindai kode QR ini."
                  : "Buka aplikasi mobile banking atau e-wallet yang mendukung QRIS, pilih Scan, lalu pindai kode QR ini."}
            </dd>
          </div>
        </dl>
      </div>

      {/* QRIS / e-wallet: status otomatis, tidak ada tombol bayar */}
      {isQr && !expired && (
        <div
          role="status"
          className="mt-4 flex items-center gap-3 rounded-xl border-2 border-edge bg-panel p-3 text-sm font-bold"
        >
          {paying ? (
            <>
              <span
                aria-hidden="true"
                className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-edge bg-accent text-xs text-on-accent"
              >
                ✓
              </span>
              <span>Pembayaran diterima. Menyiapkan e-tiketmu…</span>
            </>
          ) : (
            <>
              <span
                aria-hidden="true"
                className="size-3 shrink-0 animate-pulse rounded-full bg-accent ring-2 ring-edge"
              />
              <span>
                Menunggu pembayaran…
                <span className="block text-xs font-normal text-ink-2">
                  Halaman ini lanjut sendiri setelah pembayaran terdeteksi.
                </span>
              </span>
            </>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-ink-2">
        Demo tugas kuliah: tidak ada uang sungguhan yang diproses.
      </p>

      {expired && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          Waktu bayar habis. Buat kode baru untuk melanjutkan.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onBack}
          disabled={paying}
          className={btnGhost}
        >
          Ganti metode
        </button>
        {expired ? (
          <button
            type="button"
            onClick={onRenew}
            className={`${btnPrimary} sm:flex-1`}
          >
            Buat kode baru
          </button>
        ) : isBank ? (
          <button
            type="button"
            onClick={onPaid}
            disabled={paying}
            className={`${btnPrimary} sm:flex-1`}
          >
            {paying ? "Memeriksa pembayaran…" : "Saya sudah transfer"}
          </button>
        ) : error && !paying ? (
          // bayar otomatis sudah jalan tapi gagal menyimpan: beri jalan untuk mencoba lagi
          <button
            type="button"
            onClick={onPaid}
            className={`${btnPrimary} sm:flex-1`}
          >
            Coba lagi
          </button>
        ) : null}
      </div>
    </section>
  );
}
