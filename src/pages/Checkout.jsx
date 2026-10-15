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
import { firstName, useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { VALID_SEAT, isPremium, seatPrice, sortSeats } from "../lib/seats";
import { makeCode, saveCode } from "../lib/booking";
import { applyPromo, normalizeCode } from "../lib/promo";
import { dealPercent } from "../lib/deals";
import {
  Empty,
  ErrorBox,
  Skeleton,
  btnGhost,
  btnPrimary,
} from "../components/ui";

const METHODS = [
  "QRIS (simulasi)",
  "Transfer bank (simulasi)",
  "E-wallet (simulasi)",
];

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

  const { user, loading: authLoading, authError, signIn } = useAuth();
  const { profile } = useProfile();
  const [typed, setTyped] = useState(null);
  const name =
    typed ?? (user ? (profile?.nickname || firstName(user)).slice(0, 30) : "");
  const [method, setMethod] = useState(METHODS[0]);
  const [paying, setPaying] = useState(false);
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState(null);
  const [promoMsg, setPromoMsg] = useState(null);
  const [promoBusy, setPromoBusy] = useState(false);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !showtime) return <Skeleton className="h-72" />;
  if (!showtime || !seatsValid) {
    return (
      <Empty title="Pesanan tidak valid">
        <Link to="/" className="underline">
          Mulai dari beranda
        </Link>
      </Empty>
    );
  }

  // diskon film harian dipotong lebih dulu; kode promo dihitung dari harga setelah diskon film
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
  const total = subtotal - discount;

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
    setPromoBusy(false);
    if (promoError) {
      setPromoMsg({
        ok: false,
        text: "Kode promo belum bisa diperiksa: " + promoError.message,
      });
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
      text: `${data.title}: hemat ${rupiah(res.discount)}.`,
    });
  }

  function removePromo() {
    setPromo(null);
    setPromoInput("");
    setPromoMsg(null);
  }

  async function pay(e) {
    e.preventDefault();
    if (!user) return;
    const customer = name.trim();
    if (!customer) {
      setFormError("Isi nama panggilan dulu.");
      return;
    }
    if (promo && !applyPromo(promo, ctx).ok) {
      setPromo(null);
      setPromoMsg(null);
      setFormError(
        "Promo sudah tidak berlaku, total dikembalikan ke harga normal. Periksa lagi lalu bayar.",
      );
      return;
    }
    setPaying(true);
    setFormError("");

    await new Promise((r) => setTimeout(r, 1200));

    const code = makeCode();
    const rows = seats.map((seat_code) => ({
      booking_code: code,
      showtime_id: Number(showtimeId),
      seat_code,
      customer_name: customer,
      user_id: user.id,
      promo_code: promo ? promo.code : null,
      deal_percent: pct,
    }));

    const { error: insertError } = await supabase.from("bookings").insert(rows);

    if (insertError) {
      setPaying(false);
      if (insertError.code === "23505") setConflict(true);
      else if (insertError.code === "42501")
        setFormError(
          "Sesi login kamu berakhir atau tidak sah. Masuk lagi lalu coba bayar ulang.",
        );
      else setFormError("Gagal menyimpan pesanan: " + insertError.message);
      return;
    }

    saveCode(code);
    navigate(`/tiket/${code}`, { replace: true });
  }

  if (conflict) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-warn-line bg-warn-bg p-6"
      >
        <p className="font-display text-xl font-semibold text-accent-ink">
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
    <div className="rounded-xl border border-line p-4">
      <p className="font-display text-lg font-semibold">
        {showtime.movies.title}
      </p>
      {showtime.cinemas && (
        <p className="mt-1 text-sm font-medium text-accent-ink">
          {cinemaLabel(showtime)}
        </p>
      )}
      <p className="mt-1 text-sm capitalize text-muted">
        {fmtDate(showtime.starts_at)} · {fmtTime(showtime.starts_at)} ·{" "}
        {showtime.studio}
      </p>
      <ul className="mt-4 divide-y divide-line text-sm">
        {seats.map((c) => (
          <li key={c} className="flex justify-between py-2">
            <span>
              Kursi {c} ({isPremium(c) ? "Premium" : "Reguler"})
            </span>
            <span>{rupiah(seatPrice(c, showtime))}</span>
          </li>
        ))}
      </ul>
      {(dealDiscount > 0 || discount > 0) && (
        <div className="mt-3 space-y-1 border-t border-line-strong pt-3 text-sm text-ok">
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
        </div>
      )}
      <p
        className={`mt-3 flex justify-between ${dealDiscount > 0 || discount > 0 ? "" : "border-t border-line-strong pt-3"} font-display text-lg font-bold`}
      >
        <span>Total</span>
        <span>{rupiah(total)}</span>
      </p>
    </div>
  );

  if (authLoading) return <Skeleton className="h-72" />;
  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Ringkasan pesanan</h1>
        {summary}
        <div
          role="region"
          aria-labelledby="gate-judul"
          className="rounded-xl border border-warn-line bg-warn-bg p-5"
        >
          <h2 id="gate-judul" className="font-display text-lg font-semibold">
            Masuk dulu untuk memesan
          </h2>
          <p className="mt-2 text-sm text-ink-2">
            Tiket hanya bisa dibeli dengan akun Google, supaya pesananmu
            tersimpan di akun dan bisa dibuka lagi dari perangkat mana pun.
            Setelah masuk, kamu kembali ke halaman ini dan kursi pilihanmu tetap
            ada.
          </p>
          {authError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              Login gagal: {authError}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={signIn} className={btnPrimary}>
              Masuk dengan Google
            </button>
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
    <form onSubmit={pay} className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Ringkasan pesanan</h1>

      {summary}

      <div>
        <label htmlFor="nama" className="block text-sm font-medium text-ink-2">
          Nama panggilan
        </label>
        <input
          id="nama"
          value={name}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={30}
          placeholder="Contoh: Dinda"
          className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-panel px-3"
        />
        <p className="mt-1 text-xs text-faint">
          Diambil dari profilmu (atau akun Google), boleh kamu ganti. Nama ini
          ikut tersimpan di data pesanan.
        </p>
      </div>

      <div>
        <label htmlFor="promo" className="block text-sm font-medium text-ink-2">
          Kode promo (opsional)
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="promo"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            disabled={!!promo || promoBusy}
            maxLength={20}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            placeholder="Contoh: NONTONBERDUA"
            aria-describedby="promo-info"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-panel px-3 font-mono disabled:opacity-60"
          />
          {promo ? (
            <button type="button" onClick={removePromo} className={btnGhost}>
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
              Lihat daftar kode di{" "}
              <Link to="/promo" className="underline">
                halaman promo
              </Link>
              .
            </>
          )}
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink-2">
          Metode pembayaran
        </legend>
        <div className="mt-2 space-y-2">
          {METHODS.map((m) => (
            <label
              key={m}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-line-strong px-3 has-[:checked]:border-accent"
            >
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
              />
              {m}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="rounded-lg bg-panel p-3 text-xs text-muted">
        Ini simulasi. Tidak ada uang sungguhan yang diproses.
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
          {paying ? "Memproses…" : `Bayar ${rupiah(total)}`}
        </button>
      </div>
    </form>
  );
}
