import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { displayName, providerOf, rememberReturn, useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { useCinema } from "../lib/cinema";
import { rupiah } from "../lib/config";
import { orderTotals } from "../lib/order";
import {
  MIN_REDEEM,
  POINTS_PER_SEAT,
  POINT_VALUE,
  pointsToRupiah,
} from "../lib/points";
import { usePoints } from "../lib/usePoints";
import { usePromoMap } from "../lib/usePromos";
import AvatarUploader from "../components/AvatarUploader";
import {
  Empty,
  ErrorBox,
  SectionTitle,
  Skeleton,
  btnGhost,
  btnPrimary,
  fieldCls,
  pageTitleCls,
} from "../components/ui";
import { BOOKING_SELECT } from "./Ticket";

const fmtJoined = (iso) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
const fmtShort = (iso) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

// satu pesanan = banyak baris kursi; gabungkan per kode booking
function groupOrders(rows) {
  const map = {};
  for (const r of rows) {
    const o = (map[r.booking_code] ||= {
      code: r.booking_code,
      showtime: r.showtimes,
      promo_code: r.promo_code,
      deal_percent: r.deal_percent || 0,
      points: 0,
      seats: [],
    });
    o.seats.push(r.seat_code);
    o.points += r.points_used || 0;
  }
  return Object.values(map);
}

function Stat({ label, value, className = "" }) {
  return (
    <div className={`nb-card p-4 ${className}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tnum mt-2 break-words text-xl font-extrabold leading-tight sm:text-2xl">
        {value}
      </dd>
    </div>
  );
}

// Isian data diri. Kunci = nama kolom di tabel profiles.
const FIELDS = [
  "full_name",
  "nickname",
  "phone",
  "birth_date",
  "gender",
  "city",
  "favorite_cinema_id",
];
const fromProfile = (p) => ({
  full_name: p?.full_name || "",
  nickname: p?.nickname || "",
  phone: p?.phone || "",
  birth_date: p?.birth_date || "",
  gender: p?.gender || "",
  city: p?.city || "",
  favorite_cinema_id: p?.favorite_cinema_id ? String(p.favorite_cinema_id) : "",
});

const todayJakarta = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );

// Kelengkapan profil: berapa dari 7 data yang sudah terisi, dan apa yang masih kosong.
const COMPLETENESS = [
  ["full_name", "nama lengkap"],
  ["phone", "nomor HP"],
  ["birth_date", "tanggal lahir"],
  ["gender", "jenis kelamin"],
  ["city", "kota"],
  ["favorite_cinema_id", "bioskop favorit"],
  ["avatar_url", "foto profil"],
];
function completeness(profile) {
  const missing = COMPLETENESS.filter(([key]) => !profile?.[key]).map(
    ([, label]) => label,
  );
  return {
    done: COMPLETENESS.length - missing.length,
    total: COMPLETENESS.length,
    missing,
  };
}

// Mengembalikan teks kesalahan, atau '' kalau isian sudah benar.
function validate(v) {
  const name = v.full_name.trim();
  if (name && name.length < 2) return "Nama lengkap minimal 2 huruf.";
  const phone = v.phone.replace(/[\s\-().]/g, "");
  if (phone && !/^\+?[0-9]{8,15}$/.test(phone))
    return "Nomor HP harus 8 sampai 15 angka, contoh 081234567890.";
  if (
    v.birth_date &&
    (v.birth_date > todayJakarta() || v.birth_date < "1900-01-01")
  )
    return "Tanggal lahir tidak masuk akal.";
  const city = v.city.trim();
  if (city && city.length < 2) return "Nama kota minimal 2 huruf.";
  return "";
}

function PointsCard() {
  const { data: pts, error: ptsError } = usePoints();
  const { data: events } = useAsync(async () => {
    return unwrap(
      await supabase
        .from("point_events")
        .select("id, booking_code, kind, points, created_at")
        .order("created_at", { ascending: false })
        .limit(6),
    );
  }, []);

  const balance = pts?.balance ?? 0;
  const missing = Math.max(0, MIN_REDEEM - balance);

  return (
    <section
      aria-labelledby="poin-judul"
      className="nb-card flex flex-col bg-tile-lilac p-5"
    >
      <h2
        id="poin-judul"
        className="font-display text-xl font-extrabold leading-tight tracking-tight"
      >
        Poinmu
      </h2>

      {ptsError ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border-2 border-danger-line bg-danger-bg p-3 text-sm text-danger"
        >
          Poin belum bisa dimuat: {ptsError}. Pastikan file{" "}
          <code>supabase-v10.sql</code> sudah dijalankan.
        </p>
      ) : !pts ? (
        <Skeleton className="mt-3 h-16" />
      ) : (
        <>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="tnum font-display text-5xl font-extrabold leading-none">
              {balance}
            </span>
            <span className="text-sm font-bold">poin</span>
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Setara potongan{" "}
            <strong className="tnum">{rupiah(pointsToRupiah(balance))}</strong>
          </p>

          {missing > 0 ? (
            <div className="mt-4">
              <div
                className="h-3 overflow-hidden rounded-full border-2 border-edge bg-panel"
                role="img"
                aria-label={`${balance} dari ${MIN_REDEEM} poin untuk bisa ditukar`}
              >
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${Math.min(100, (balance / MIN_REDEEM) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-ink-2">
                Kurang <strong className="tnum">{missing}</strong> poin lagi
                supaya bisa ditukar (minimal {MIN_REDEEM} poin).
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm font-bold">
              Poinmu sudah bisa ditukar saat bayar.
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-2">Total didapat</dt>
              <dd className="tnum font-bold">{pts.earned}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">Sudah dipakai</dt>
              <dd className="tnum font-bold">{pts.spent}</dd>
            </div>
          </dl>
        </>
      )}

      {events && events.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t-2 border-edge pt-3 text-sm">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="min-w-0 truncate">
                <span className="text-xs text-ink-2">
                  {fmtShort(e.created_at)}
                </span>{" "}
                {e.kind === "earn" ? "Dapat dari " : "Dipakai di "}
                {e.booking_code ? (
                  <Link
                    to={`/tiket/${e.booking_code}`}
                    className="tnum underline"
                  >
                    {e.booking_code}
                  </Link>
                ) : (
                  "pesanan"
                )}
              </span>
              <span className="tnum shrink-0 font-bold">
                {e.points > 0 ? "+" : "−"}
                {Math.abs(e.points)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-2">
        Setiap kursi yang dibeli = {POINTS_PER_SEAT} poin. 1 poin ={" "}
        {rupiah(POINT_VALUE)} potongan, ditukar saat checkout.
      </p>
    </section>
  );
}

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    save,
    reset,
  } = useProfile();
  const { cinemas, select } = useCinema();

  const {
    data: orders,
    error: ordersError,
    reload,
  } = useAsync(async () => {
    if (!user) return null;
    return groupOrders(
      unwrap(
        await supabase
          .from("bookings")
          .select(BOOKING_SELECT)
          .eq("user_id", user.id)
          .limit(1000),
      ),
    );
  }, [user?.id]);

  const { data: promoMap } = usePromoMap();

  // draft = isian yang sedang diubah (kolom yang belum disentuh tetap memakai nilai tersimpan)
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [confirmReset, setConfirmReset] = useState(false);

  if (authLoading) return <Skeleton className="h-64" />;
  if (!user) {
    return (
      <Empty title="Masuk untuk melihat profilmu">
        <p>Profil menyimpan data diri, foto, poin, dan tiketmu di satu akun.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link to="/masuk" onClick={rememberReturn} className={btnPrimary}>
            Masuk
          </Link>
          <Link to="/daftar" onClick={rememberReturn} className={btnGhost}>
            Daftar
          </Link>
        </div>
      </Empty>
    );
  }

  const saved = fromProfile(profile);
  const values = { ...saved, ...draft };
  const set = (key) => (e) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));
  const dirty = FIELDS.some(
    (k) => String(values[k]).trim() !== String(saved[k]),
  );

  async function onSave(e) {
    e.preventDefault();
    const problem = validate(values);
    if (problem) return setMsg({ ok: false, text: problem });
    setBusy(true);
    setMsg(null);
    try {
      await save(Object.fromEntries(FIELDS.map((k) => [k, values[k]])));
      if (values.favorite_cinema_id) select(values.favorite_cinema_id); // bioskop favorit langsung dipakai sebagai pilihan
      setDraft({});
      setMsg({ ok: true, text: "Data diri disimpan." });
    } catch (err) {
      setMsg({
        ok: false,
        text: "Gagal menyimpan: " + (err.message || "coba lagi"),
      });
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    setMsg(null);
    try {
      await reset();
      setDraft({});
      setConfirmReset(false);
      setMsg({
        ok: true,
        text: "Data diri dan foto direset. Poin dan riwayat pesanan tidak berubah.",
      });
    } catch (err) {
      setMsg({
        ok: false,
        text: "Gagal mereset: " + (err.message || "coba lagi"),
      });
    } finally {
      setBusy(false);
    }
  }

  // statistik dari pesanan yang tersimpan di akun ini
  let stats = null;
  if (orders && promoMap) {
    const perCinema = {};
    let spent = 0;
    for (const o of orders) {
      spent += orderTotals(
        o.seats,
        o.showtime,
        o.promo_code ? promoMap?.[o.promo_code] : null,
        o.deal_percent,
        o.points,
      ).total;
      const name = o.showtime.cinemas?.name;
      if (name) perCinema[name] = (perCinema[name] || 0) + 1;
    }
    const top = Object.entries(perCinema).sort((a, b) => b[1] - a[1])[0];
    stats = { orderCount: orders.length, spent, topCinema: top ? top[0] : "-" };
  }

  const label = "block text-sm font-semibold text-ink-2";
  const hint = "mt-1 text-xs text-faint";
  const name = profile?.full_name || displayName(user);

  return (
    <div className="space-y-8">
      <h1 className={pageTitleCls}>Profil</h1>

      {/* bento atas: identitas + foto, dan poin */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
        <section
          aria-labelledby="akun-judul"
          className="nb-card flex flex-col bg-tile-yellow p-5 sm:p-6 lg:col-span-7"
        >
          <h2 id="akun-judul" className="sr-only">
            Akun
          </h2>
          <AvatarUploader size={96} />
          <div className="mt-5 min-w-0 border-t-2 border-edge pt-4">
            <p className="break-words font-display text-2xl font-extrabold leading-tight tracking-tight">
              {name}
            </p>
            {user.email && (
              <p className="mt-1 break-all text-sm text-ink-2">{user.email}</p>
            )}
            <p className="mt-1 text-xs text-ink-2">
              Masuk dengan {providerOf(user) === "google" ? "Google" : "email"}
              {user.created_at && ` · bergabung ${fmtJoined(user.created_at)}`}
            </p>
          </div>

          {(() => {
            const c = completeness(profile);
            return (
              <div className="mt-auto pt-5">
                <p className="flex items-baseline justify-between text-sm font-bold">
                  <span>Kelengkapan profil</span>
                  <span className="tnum">
                    {c.done} dari {c.total}
                  </span>
                </p>
                <div
                  className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-edge bg-panel"
                  role="img"
                  aria-label={`${c.done} dari ${c.total} data profil terisi`}
                >
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${(c.done / c.total) * 100}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-ink-2">
                  {c.missing.length === 0
                    ? "Semua data terisi."
                    : `Belum diisi: ${c.missing.join(", ")}.`}
                </p>
              </div>
            );
          })()}
        </section>

        <div className="lg:col-span-5">
          <PointsCard />
        </div>
      </div>

      <section aria-labelledby="stat-judul">
        <SectionTitle id="stat-judul">Ringkasan pesananmu</SectionTitle>
        {ordersError ? (
          <ErrorBox message={ordersError} onRetry={reload} />
        ) : !stats ? (
          <Skeleton className="h-24" />
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Pesanan" value={stats.orderCount} />
            <Stat
              label="Total belanja (simulasi, setelah diskon, promo & poin)"
              value={rupiah(stats.spent)}
            />
            <Stat
              label="Bioskop terfavorit"
              value={stats.topCinema}
              className="col-span-2 sm:col-span-1"
            />
          </dl>
        )}
        <p className="mt-3 text-sm">
          <Link to="/riwayat" className="font-bold text-accent-ink underline">
            Lihat semua riwayat pesanan
          </Link>
        </p>
      </section>

      <form
        onSubmit={onSave}
        aria-labelledby="atur-judul"
        className="nb-card space-y-5 p-5 sm:p-6"
        noValidate
      >
        <div>
          <h2
            id="atur-judul"
            className="font-display text-xl font-extrabold tracking-tight sm:text-2xl"
          >
            Data diri
          </h2>
          <p className="mt-1 text-sm text-muted">
            Hanya kamu yang bisa melihat data ini. Tidak dibagikan ke pengguna
            lain.
          </p>
        </div>

        {profileError && (
          <p
            role="alert"
            className="rounded-xl border-2 border-danger-line bg-danger-bg p-3 text-sm text-danger"
          >
            Profil tidak bisa dimuat: {profileError}. Pastikan file{" "}
            <code>supabase-profile.sql</code> dan <code>supabase-v10.sql</code>{" "}
            sudah dijalankan.
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="full_name" className={label}>
              Nama lengkap
            </label>
            <input
              id="full_name"
              value={values.full_name}
              onChange={set("full_name")}
              maxLength={60}
              autoComplete="name"
              disabled={profileLoading || busy}
              placeholder={displayName(user)}
              className={`mt-1 ${fieldCls}`}
            />
          </div>

          <div>
            <label htmlFor="nick" className={label}>
              Nama panggilan
            </label>
            <input
              id="nick"
              value={values.nickname}
              onChange={set("nickname")}
              maxLength={30}
              disabled={profileLoading || busy}
              placeholder="Kosong = pakai nama depanmu"
              className={`mt-1 ${fieldCls}`}
            />
            <p className={hint}>
              Dipakai otomatis saat checkout dan tercetak di tiket.
            </p>
          </div>

          <div>
            <label htmlFor="phone" className={label}>
              Nomor HP
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={set("phone")}
              maxLength={20}
              disabled={profileLoading || busy}
              placeholder="081234567890"
              className={`mt-1 ${fieldCls}`}
            />
          </div>

          <div>
            <label htmlFor="birth_date" className={label}>
              Tanggal lahir
            </label>
            <input
              id="birth_date"
              type="date"
              value={values.birth_date}
              onChange={set("birth_date")}
              min="1900-01-01"
              max={todayJakarta()}
              autoComplete="bday"
              disabled={profileLoading || busy}
              className={`mt-1 ${fieldCls}`}
            />
          </div>

          <div>
            <label htmlFor="gender" className={label}>
              Jenis kelamin
            </label>
            <select
              id="gender"
              value={values.gender}
              onChange={set("gender")}
              disabled={profileLoading || busy}
              className={`mt-1 ${fieldCls}`}
            >
              <option value="">Belum diisi</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
              <option value="X">Tidak ingin menyebut</option>
            </select>
          </div>

          <div>
            <label htmlFor="city" className={label}>
              Kota
            </label>
            <input
              id="city"
              value={values.city}
              onChange={set("city")}
              maxLength={40}
              autoComplete="address-level2"
              disabled={profileLoading || busy}
              placeholder="Contoh: Bandung"
              className={`mt-1 ${fieldCls}`}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="fav" className={label}>
              Bioskop favorit
            </label>
            <select
              id="fav"
              value={values.favorite_cinema_id}
              onChange={set("favorite_cinema_id")}
              disabled={profileLoading || busy}
              className={`mt-1 ${fieldCls}`}
            >
              <option value="">Belum ada</option>
              {cinemas.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} · {c.city}
                </option>
              ))}
            </select>
            <p className={hint}>
              Jadi pilihan awal di beranda, juga di perangkat lain yang kamu
              pakai masuk.
            </p>
          </div>
        </div>

        {msg && (
          <p
            role={msg.ok ? "status" : "alert"}
            className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}
          >
            {msg.text}
          </p>
        )}

        <button
          type="submit"
          disabled={!dirty || busy || profileLoading}
          className={`${btnPrimary} w-full sm:w-auto`}
        >
          {busy ? "Menyimpan…" : "Simpan perubahan"}
        </button>
      </form>

      <section className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={signOut} className={btnGhost}>
          Keluar
        </button>
        {profile &&
          (confirmReset ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Yakin reset data diri dan foto?
              <button
                type="button"
                onClick={onReset}
                disabled={busy}
                className="min-h-11 rounded-xl border-2 border-danger-line px-3 font-semibold text-danger hover:bg-danger-bg"
              >
                Ya, reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-11 px-2 underline"
              >
                Batal
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex min-h-11 items-center text-sm text-muted underline"
            >
              Reset data diri
            </button>
          ))}
      </section>

      <p className="text-xs text-faint">
        Email hanya tampil di halaman ini dan tidak ikut tersimpan di data
        pesanan. Pesanan yang sudah dibuat tidak bisa dihapus dari sini.
      </p>
    </div>
  );
}
