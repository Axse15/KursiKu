import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import {
  MAX_SEATS,
  cinemaLabel,
  fmtDate,
  fmtTime,
  rupiah,
} from "../lib/config";
import { firstName, rememberReturn, useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { VALID_SEAT, isPremium, seatPrice, sortSeats } from "../lib/seats";
import { makeCode, saveCode } from "../lib/booking";
import { applyPromo, normalizeCode } from "../lib/promo";
import { dealPercent } from "../lib/deals";
import {
  MIN_REDEEM,
  POINT_VALUE,
  maxRedeem,
  pointsEarned,
  pointsToRupiah,
} from "../lib/points";
import { usePoints } from "../lib/usePoints";
import { METHODS, newPayment } from "../lib/payment";
import PaymentPanel from "../components/PaymentPanel";
import {
  Empty,
  ErrorBox,
  Skeleton,
  btnGhost,
  btnPrimary,
  fieldCls,
  pageTitleCls,
} from "../components/ui";

// Kotak tukar poin di checkout. pts = null saat memuat atau kalau fungsi my_points belum ada (supabase-v10.sql belum dijalankan).
function PointsBox({ pts, balance, maxPts, pointsUsed, wanted, onChange }) {
  const on = pointsUsed > 0;
  let note;
  if (!pts) note = "Saldo poin belum bisa dimuat.";
  else if (balance < MIN_REDEEM)
    note = `Saldo ${balance} poin. Poin bisa ditukar mulai ${MIN_REDEEM} poin (${rupiah(pointsToRupiah(MIN_REDEEM))}).`;
  else if (maxPts === 0)
    note =
      "Total pesanan ini terlalu kecil untuk menukar poin (poin menutup maksimal 50% tagihan).";
  else
    note = `Saldo ${balance} poin. Maksimal ${maxPts} poin (${rupiah(pointsToRupiah(maxPts))}) untuk pesanan ini.`;

  return (
    <div className="rounded-xl border-2 border-edge bg-panel p-3">
      <label
        className={`flex min-h-11 items-center gap-3 text-sm font-semibold ${maxPts > 0 ? "" : "opacity-60"}`}
      >
        <input
          type="checkbox"
          checked={on}
          disabled={maxPts === 0}
          onChange={(e) => onChange(e.target.checked ? maxPts : 0)}
          className="size-4 accent-[var(--color-accent-ink)]"
        />
        Pakai poin
      </label>
      <p className="text-xs text-muted">{note}</p>
      {on && maxPts > MIN_REDEEM && (
        <div className="mt-3">
          <label
            htmlFor="poin-pakai"
            className="flex justify-between text-sm font-semibold text-ink-2"
          >
            <span>Poin dipakai</span>
            <span className="tnum">
              {pointsUsed} poin = −{rupiah(pointsToRupiah(pointsUsed))}
            </span>
          </label>
          <input
            id="poin-pakai"
            type="range"
            min={MIN_REDEEM}
            max={maxPts}
            step={10}
            value={Math.min(Math.max(wanted, MIN_REDEEM), maxPts)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="mt-1 h-7 w-full cursor-pointer accent-[var(--color-accent-ink)]"
          />
        </div>
      )}
      <p className="mt-2 text-xs text-faint">
        1 poin = {rupiah(POINT_VALUE)}. Dapat 10 poin tiap kursi yang dibeli.
      </p>
    </div>
  );
}

export default function Checkout() {
  const { showtimeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const seats = useMemo(
    () =>
      sortSeats([
        ...new Set((params.get("seats") || "").split(",").filter(Boolean)),
      ]),
    [params],
  );
  const seatsValid =
    seats.length > 0 &&
    seats.length <= MAX_SEATS &&
    seats.every((s) => VALID_SEAT.test(s));

  const {
    data: showtime,
    loading,
    error,
    reload,
  } = useAsync(
    async () =>
      unwrap(
        await supabase
          .from("showtimes")
          .select("*, movies(title), cinemas(name, city)")
          .eq("id", showtimeId)
          .maybeSingle(),
      ),
    [showtimeId],
  );

  const { user, loading: authLoading, authError } = useAuth();
  const { profile } = useProfile();
  // null = belum diketik, jadi nama otomatis: nama panggilan di profil, atau nama depan akunmu
  const [typed, setTyped] = useState(null);
  const name =
    typed ?? (user ? (profile?.nickname || firstName(user)).slice(0, 30) : "");
  const [methodId, setMethodId] = useState(METHODS[0].id);
  const method = METHODS.find((m) => m.id === methodId) || METHODS[0];
  const [step, setStep] = useState("form"); // 'form' = isi data, 'pay' = tampilan QR / virtual account
  const [payment, setPayment] = useState(null);
  const [paying, setPaying] = useState(false);
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);

  // kode promo: promoInput = isi kolom, promo = promo yang sudah diterima
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState(null);
  const [promoMsg, setPromoMsg] = useState(null); // { ok, text }
  const [promoBusy, setPromoBusy] = useState(false);

  // poin: ptsWanted = yang diminta pembeli; yang benar-benar dipakai dibatasi saldo dan 50% tagihan (lihat pointsUsed di bawah)
  const { data: pts, reload: reloadPoints } = usePoints();
  const [ptsWanted, setPtsWanted] = useState(0);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !showtime) return <Skeleton className="h-72" />;
  if (!showtime || !seatsValid) {
    return (
      <Empty title="Pesanan tidak valid">
        <Link to="/" className="font-semibold text-accent-ink underline">
          Mulai dari beranda
        </Link>
      </Empty>
    );
  }

  // diskon film harian (deals.js) dipotong lebih dulu; kode promo dihitung dari harga setelah diskon film
  const pct = dealPercent(showtime.movie_id, showtime.starts_at);
  const base = seats.reduce((sum, c) => sum + seatPrice(c, showtime), 0);
  const subtotal = seats.reduce(
    (sum, c) => sum + seatPrice(c, showtime, pct),
    0,
  );
  const dealDiscount = base - subtotal;
  const ctx = {
    subtotal,
    seatCount: seats.length,
    startsAt: showtime.starts_at,
  };
  const priced = promo ? applyPromo(promo, ctx) : null;
  const discount = priced?.ok ? priced.discount : 0;
  const afterPromo = subtotal - discount;

  // Poin ditukar dari sisa tagihan setelah diskon film dan promo. Batasnya ikut menyusut kalau promo dipasang.
  const balance = pts?.balance ?? 0;
  const maxPts = maxRedeem(balance, afterPromo);
  const pointsUsed =
    ptsWanted >= MIN_REDEEM && maxPts > 0 ? Math.min(ptsWanted, maxPts) : 0;
  const pointsDiscount = pointsToRupiah(pointsUsed);
  const total = afterPromo - pointsDiscount;

  async function applyCode() {
    const code = normalizeCode(promoInput);
    if (!code) {
      setPromoMsg({ ok: false, text: "Ketik kode promo dulu." });
      return;
    }
    setPromoBusy(true);
    setPromoMsg(null);
    const { data, error: promoError } = await supabase
      .from("promos")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();
    // Kode sekali pakai dan hanya terbuka di hari tertentu: keputusannya diambil database (promo_status, supabase-v8.sql)
    const status = data
      ? await supabase.rpc("promo_status", { p_code: code })
      : null;
    setPromoBusy(false);
    const failure = promoError || status?.error;
    if (failure) {
      setPromo(null);
      setPromoMsg({
        ok: false,
        text: "Kode promo belum bisa diperiksa: " + failure.message,
      });
      return;
    }
    const state = status?.data;
    const refused =
      state === "used"
        ? "Kode ini sudah pernah kamu pakai. Setiap kode hanya bisa dipakai sekali per akun."
        : state === "closed"
          ? "Kode ini tidak berlaku hari ini. Kode promo hanya terbuka di hari-hari tertentu."
          : null;
    if (refused) {
      setPromo(null);
      setPromoMsg({ ok: false, text: refused });
      return;
    }
    const res = applyPromo(data, ctx);
    if (!res.ok) {
      setPromo(null);
      setPromoMsg({ ok: false, text: res.reason });
      return;
    }
    setPromo(data);
    setPromoInput(code);
    setPromoMsg({
      ok: true,
      text: `${data.title}: hemat ${rupiah(res.discount)}. Kode ini terpakai saat pembayaran berhasil.`,
    });
  }

  function removePromo() {
    setPromo(null);
    setPromoInput("");
    setPromoMsg(null);
  }

  // Langkah 1: periksa isian, lalu tampilkan QR / nomor virtual account
  function proceed(e) {
    e.preventDefault();
    if (!user) return; // penjaga cadangan; tombol bayar juga tidak tampil untuk tamu
    const customer = name.trim();
    if (!customer) {
      setFormError("Isi nama panggilan dulu.");
      return;
    }
    // kode sudah diketik tapi belum ditekan "Pakai": jangan diam-diam bayar tanpa potongan
    if (!promo && normalizeCode(promoInput)) {
      setFormError(
        'Kode promo belum dipakai. Tekan "Pakai" dulu supaya potongannya masuk, atau kosongkan kolom kodenya.',
      );
      document.getElementById("promo")?.focus();
      return;
    }
    // syarat promo diperiksa ulang tepat sebelum bayar (mis. jam sudah lewat tengah malam)
    if (promo && !applyPromo(promo, ctx).ok) {
      setPromo(null);
      setPromoMsg(null);
      setFormError(
        "Promo sudah tidak berlaku, total dikembalikan ke harga normal. Periksa lagi lalu bayar.",
      );
      return;
    }
    setFormError("");
    setPayment(newPayment(total));
    setStep("pay");
  }

  // Langkah 2: pembayaran masuk (QRIS/e-wallet terdeteksi otomatis, transfer bank lewat tombol), pesanan disimpan
  async function confirmPaid() {
    if (!user || !payment) return;
    const customer = name.trim();
    if (payment.expiresAt <= Date.now()) return; // waktu bayar habis: tombol 'Buat kode baru' yang tampil
    setPaying(true);
    setFormError("");

    await new Promise((r) => setTimeout(r, 1200)); // simulasi proses pembayaran

    const code = makeCode();
    const rows = seats.map((seat_code, i) => ({
      booking_code: code,
      showtime_id: Number(showtimeId),
      seat_code,
      customer_name: customer,
      user_id: user.id, // database menolak user_id milik orang lain, dan menolak pesanan tanpa login
      promo_code: promo ? promo.code : null,
      deal_percent: pct, // dicatat supaya total tiket tidak berubah kalau aturan diskon kelak diganti
      // poin yang ditukar dicatat di kursi pertama saja (jumlahnya dijumlahkan per kode booking). Kolom ini baru ada setelah supabase-v10.sql.
      ...(i === 0 && pointsUsed > 0 ? { points_used: pointsUsed } : {}),
    }));

    // Satu insert = satu transaksi: kalau salah satu kursi bentrok, SEMUA ditolak.
    const { error: insertError } = await supabase.from("bookings").insert(rows);

    if (insertError) {
      setPaying(false);
      if (insertError.code === "23505")
        setConflict(true); // unique violation
      else if (/promo_used|promo_closed/.test(insertError.message || "")) {
        // dijaga database: kode sudah terpakai (mis. di tab lain) atau harinya sudah lewat. Tidak ada kursi yang tersimpan.
        const used = /promo_used/.test(insertError.message);
        setPromo(null);
        setPromoMsg(null);
        setPromoInput("");
        setStep("form"); // total berubah: kembali ke langkah isi data
        setFormError(
          (used
            ? "Kode promo ini sudah pernah kamu pakai."
            : "Kode promo ini sudah tidak berlaku hari ini.") +
            " Total dikembalikan ke harga normal. Periksa lagi lalu bayar.",
        );
      } else if (
        /points_insufficient|points_login/.test(insertError.message || "")
      ) {
        // saldo poin ternyata kurang (mis. sudah terpakai di tab lain). Tidak ada kursi yang tersimpan.
        reloadPoints();
        setPtsWanted(0);
        setStep("form");
        setFormError(
          "Saldo poinmu tidak cukup untuk penukaran ini. Total dikembalikan tanpa potongan poin. Periksa lagi lalu bayar.",
        );
      } else if (insertError.code === "42501")
        setFormError(
          "Sesi login kamu berakhir atau tidak sah. Masuk lagi lalu coba bayar ulang.",
        );
      else setFormError("Gagal menyimpan pesanan: " + insertError.message);
      return;
    }

    saveCode(code);
    navigate(`/tiket/${code}`, {
      replace: true,
      state: { earned: pointsEarned(seats.length) },
    });
  }

  if (conflict) {
    return (
      <div
        role="alert"
        className="rounded-xl border-2 border-warn-line bg-warn-bg p-6"
      >
        <p className="text-xl font-bold tracking-tight text-warn">
          Kursi baru saja dipesan orang lain
        </p>
        <p className="mt-2 text-ink-2">
          Pembayaran tidak diproses. Silakan pilih kursi lain.
        </p>
        <Link
          to={`/pilih-kursi/${showtimeId}?conflict=1`}
          className={`${btnPrimary} mt-4`}
        >
          Pilih kursi lagi
        </Link>
      </div>
    );
  }

  const summary = (
    <div className="overflow-hidden nb-card">
      <div className="border-b-2 border-edge bg-tile-yellow p-4">
        <p className="text-lg font-bold leading-snug tracking-tight">
          {showtime.movies.title}
        </p>
        {showtime.cinemas && (
          <p className="mt-1 text-sm font-bold">{cinemaLabel(showtime)}</p>
        )}
        <p className="mt-1 text-xs capitalize text-ink-2">
          {fmtDate(showtime.starts_at)} · {fmtTime(showtime.starts_at)} ·{" "}
          {showtime.studio}
        </p>
      </div>
      <div className="p-4">
        <ul className="divide-y divide-line text-sm">
          {seats.map((c) => (
            <li key={c} className="flex justify-between py-2">
              <span>
                Kursi {c} ({isPremium(c) ? "Premium" : "Reguler"})
              </span>
              <span className="tnum">{rupiah(seatPrice(c, showtime))}</span>
            </li>
          ))}
        </ul>
        {(dealDiscount > 0 || discount > 0 || pointsDiscount > 0) && (
          <div className="tnum mt-3 space-y-1 border-t border-line pt-3 text-sm text-ok">
            {dealDiscount > 0 && (
              <p className="flex justify-between">
                <span>Diskon film {pct}%</span>
                <span>− {rupiah(dealDiscount)}</span>
              </p>
            )}
            {discount > 0 && (
              <p className="flex justify-between">
                <span>Promo {promo.code}</span>
                <span>− {rupiah(discount)}</span>
              </p>
            )}
            {pointsDiscount > 0 && (
              <p className="flex justify-between">
                <span>Poin {pointsUsed}</span>
                <span>− {rupiah(pointsDiscount)}</span>
              </p>
            )}
          </div>
        )}
        <p
          className={`mt-3 flex items-baseline justify-between ${dealDiscount > 0 || discount > 0 || pointsDiscount > 0 ? "" : "border-t border-line pt-3"}`}
        >
          <span className="font-semibold">Total</span>
          <span className="tnum text-2xl font-extrabold leading-none">
            {rupiah(total)}
          </span>
        </p>
        {user && (
          <p className="mt-2 text-xs text-muted">
            Kamu akan dapat{" "}
            <strong className="tnum">+{pointsEarned(seats.length)} poin</strong>{" "}
            dari pesanan ini.
          </p>
        )}
      </div>
    </div>
  );

  // ---- Wajib login: tamu hanya melihat ringkasan, lalu diminta masuk dan dikembalikan ke halaman ini ----
  if (authLoading) return <Skeleton className="h-72" />;
  if (!user) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className={pageTitleCls}>Ringkasan pesanan</h1>
        {summary}
        <div
          role="region"
          aria-labelledby="gate-judul"
          className="rounded-xl border-2 border-warn-line bg-warn-bg p-5"
        >
          <h2 id="gate-judul" className="text-lg font-bold tracking-tight">
            Masuk dulu untuk memesan
          </h2>
          <p className="mt-2 text-sm text-ink-2">
            Tiket hanya bisa dibeli dengan akun, supaya pesananmu tersimpan,
            poinnya terhitung, dan bisa dibuka lagi dari perangkat mana pun.
            Setelah masuk, kamu kembali ke halaman ini dan kursi pilihanmu tetap
            ada.
          </p>
          {authError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              Login gagal: {authError}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/masuk" onClick={rememberReturn} className={btnPrimary}>
              Masuk
            </Link>
            <Link to="/daftar" onClick={rememberReturn} className={btnGhost}>
              Daftar
            </Link>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={btnGhost}
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={proceed}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-x-12"
    >
      <h1 className={`${pageTitleCls} lg:col-span-2`}>
        {step === "pay" ? "Pembayaran" : "Ringkasan pesanan"}
      </h1>

      {/* di HP dan tablet, saat membayar, kode QR / nomor VA tampil lebih dulu dan ringkasan pesanan di bawahnya */}
      <div
        className={`lg:order-none lg:col-start-2 lg:row-start-2 lg:sticky lg:top-24 lg:self-start ${step === "pay" ? "order-2" : ""}`}
      >
        {summary}
      </div>

      {step === "pay" && payment ? (
        <div className="lg:col-start-1 lg:row-start-2">
          <PaymentPanel
            method={method}
            payment={payment}
            paying={paying}
            error={formError}
            onPaid={confirmPaid}
            onBack={() => {
              setStep("form");
              setFormError("");
            }}
            onRenew={() => setPayment(newPayment(total))}
          />
        </div>
      ) : (
        <div className="space-y-6 lg:col-start-1 lg:row-start-2">
          <div>
            <label
              htmlFor="nama"
              className="block text-sm font-semibold text-ink-2"
            >
              Nama panggilan
            </label>
            <input
              id="nama"
              value={name}
              onChange={(e) => setTyped(e.target.value)}
              maxLength={30}
              placeholder="Contoh: Dinda"
              className={`mt-1 ${fieldCls}`}
            />
            <p className="mt-1 text-xs text-faint">
              Diambil dari profilmu (atau nama akunmu), boleh kamu ganti. Nama
              ini ikut tersimpan di data pesanan.
            </p>
          </div>

          <div>
            <label
              htmlFor="promo"
              className="block text-sm font-semibold text-ink-2"
            >
              Kode promo (opsional)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="promo"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  // Enter di kolom ini = "Pakai", BUKAN membayar (form ini akan mengirim pesanan kalau Enter dibiarkan)
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!promo && !promoBusy) applyCode();
                  }
                }}
                disabled={!!promo || promoBusy}
                maxLength={20}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="Masukkan kode promo"
                aria-describedby="promo-info"
                className={`${fieldCls} min-w-0 flex-1 uppercase tracking-wide disabled:opacity-60`}
              />
              {promo ? (
                <button
                  type="button"
                  onClick={removePromo}
                  className={btnGhost}
                >
                  Hapus
                </button>
              ) : (
                <button
                  type="button"
                  onClick={applyCode}
                  disabled={promoBusy}
                  className={btnGhost}
                >
                  {promoBusy ? "Memeriksa…" : "Pakai"}
                </button>
              )}
            </div>
            <p
              id="promo-info"
              role={promoMsg ? (promoMsg.ok ? "status" : "alert") : undefined}
              className={`mt-1 text-sm ${promoMsg ? (promoMsg.ok ? "text-ok" : "text-danger") : "text-faint"}`}
            >
              {promoMsg ? (
                promoMsg.text
              ) : (
                <>
                  Kode hari ini ada di{" "}
                  <Link
                    to="/promo"
                    className="font-semibold text-accent-ink underline"
                  >
                    halaman promo
                  </Link>
                  . Satu kode hanya bisa dipakai sekali.
                </>
              )}
            </p>
          </div>

          <PointsBox
            pts={pts}
            balance={balance}
            maxPts={maxPts}
            pointsUsed={pointsUsed}
            wanted={ptsWanted}
            onChange={setPtsWanted}
          />

          <fieldset>
            <legend className="text-sm font-semibold text-ink-2">
              Metode pembayaran
            </legend>
            <div className="mt-2 space-y-2">
              {METHODS.map((m) => (
                <label
                  key={m.id}
                  className="flex min-h-11 items-center gap-3 rounded-xl border-2 border-edge bg-panel px-3 text-sm font-semibold has-[:checked]:bg-tile-yellow"
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.label}
                    checked={methodId === m.id}
                    onChange={() => setMethodId(m.id)}
                    className="size-4 accent-[var(--color-accent-ink)]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="rounded-xl border-2 border-edge bg-panel p-3 text-xs text-ink-2">
            Di langkah berikutnya kamu akan melihat kode QR atau nomor virtual
            account. Tidak ada uang sungguhan yang diproses (demo tugas kuliah).
          </p>

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={paying}
              className={btnGhost}
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={paying}
              className={`${btnPrimary} flex-1`}
            >
              {`Lanjut bayar ${rupiah(total)}`}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
