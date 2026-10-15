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

  const { enabled, user, loading: authLoading, signIn } = useAuth();
  const { profile } = useProfile();
  // null = belum diketik, jadi nama otomatis: nama panggilan di profil, atau nama depan akun Google
  const [typed, setTyped] = useState(null);
  const name =
    typed ?? (user ? (profile?.nickname || firstName(user)).slice(0, 30) : "");
  const [method, setMethod] = useState(METHODS[0]);
  const [paying, setPaying] = useState(false);
  const [formError, setFormError] = useState("");
  const [conflict, setConflict] = useState(false);

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

  const total = seats.reduce((sum, c) => sum + seatPrice(c, showtime), 0);

  async function pay(e) {
    e.preventDefault();
    const customer = name.trim();
    if (!customer) {
      setFormError("Isi nama panggilan dulu.");
      return;
    }
    setPaying(true);
    setFormError("");

    await new Promise((r) => setTimeout(r, 1200)); // simulasi proses pembayaran

    const code = makeCode();
    const rows = seats.map((seat_code) => ({
      booking_code: code,
      showtime_id: Number(showtimeId),
      seat_code,
      customer_name: customer,
      user_id: user?.id ?? null, // terisi hanya kalau sudah login; database menolak user_id milik orang lain
    }));

    // Satu insert = satu transaksi: kalau salah satu kursi bentrok, SEMUA ditolak.
    const { error: insertError } = await supabase.from("bookings").insert(rows);

    if (insertError) {
      setPaying(false);
      if (insertError.code === "23505")
        setConflict(true); // unique violation
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
        className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-6"
      >
        <p className="font-display text-xl font-semibold text-amber-300">
          Kursi baru saja dipesan orang lain
        </p>
        <p className="mt-2 text-zinc-300">
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

  return (
    <form onSubmit={pay} className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Ringkasan pesanan</h1>

      <div className="rounded-xl border border-zinc-800 p-4">
        <p className="font-display text-lg font-semibold">
          {showtime.movies.title}
        </p>
        {showtime.cinemas && (
          <p className="mt-1 text-sm font-medium text-amber-300">
            {cinemaLabel(showtime)}
          </p>
        )}
        <p className="mt-1 text-sm capitalize text-zinc-400">
          {fmtDate(showtime.starts_at)} · {fmtTime(showtime.starts_at)} ·{" "}
          {showtime.studio}
        </p>
        <ul className="mt-4 divide-y divide-zinc-800 text-sm">
          {seats.map((c) => (
            <li key={c} className="flex justify-between py-2">
              <span>
                Kursi {c} ({isPremium(c) ? "Premium" : "Reguler"})
              </span>
              <span>{rupiah(seatPrice(c, showtime))}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-zinc-700 pt-3 font-display text-lg font-bold">
          <span>Total</span>
          <span>{rupiah(total)}</span>
        </p>
      </div>

      {enabled && !authLoading && !user && (
        <div className="rounded-xl border border-zinc-800 p-4 text-sm">
          <p className="text-zinc-300">
            Punya akun Google? Masuk supaya nama terisi otomatis dan tiketmu
            tersimpan di akun (bisa dibuka dari perangkat lain). Boleh juga
            lanjut tanpa masuk.
          </p>
          <button type="button" onClick={signIn} className={`${btnGhost} mt-3`}>
            Masuk dengan Google
          </button>
        </div>
      )}

      <div>
        <label
          htmlFor="nama"
          className="block text-sm font-medium text-zinc-300"
        >
          Nama panggilan
        </label>
        <input
          id="nama"
          value={name}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={30}
          placeholder="Contoh: Dinda"
          className="mt-1 min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {user
            ? "Diambil dari profilmu (atau akun Google), boleh kamu ganti. Nama ini ikut tersimpan di data pesanan."
            : "Tidak perlu email atau nomor HP."}
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-300">
          Metode pembayaran
        </legend>
        <div className="mt-2 space-y-2">
          {METHODS.map((m) => (
            <label
              key={m}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-zinc-700 px-3 has-[:checked]:border-amber-400"
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

      <p className="rounded-lg bg-zinc-900 p-3 text-xs text-zinc-400">
        Ini simulasi. Tidak ada uang sungguhan yang diproses.
      </p>

      {formError && (
        <p role="alert" className="text-sm text-red-300">
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
