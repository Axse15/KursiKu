import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, unwrap } from "../lib/supabase";
import { useAsync } from "../lib/useAsync";
import { displayName, useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { useCinema } from "../lib/cinema";
import { cinemaLabel, fmtDate, fmtTime, rupiah } from "../lib/config";
import { sortSeats } from "../lib/seats";
import { orderTotals } from "../lib/order";
import { usePromoMap } from "../lib/usePromos";
import { Avatar } from "../components/AuthButton";
import {
  Empty,
  ErrorBox,
  SectionTitle,
  Skeleton,
  btnGhost,
  btnPrimary,
  fieldCls,
} from "../components/ui";
import { BOOKING_SELECT } from "./Ticket";

const fmtJoined = (iso) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

// satu pesanan = banyak baris kursi; gabungkan per kode booking
function groupOrders(rows) {
  const map = {};
  for (const r of rows) {
    (map[r.booking_code] ||= {
      code: r.booking_code,
      showtime: r.showtimes,
      promo_code: r.promo_code,
      deal_percent: r.deal_percent || 0,
      seats: [],
    }).seats.push(r.seat_code);
  }
  return Object.values(map);
}

function Stat({ label, value }) {
  return (
    <div className="nb-card p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="tnum mt-2 break-words text-2xl font-extrabold leading-tight">
        {value}
      </dd>
    </div>
  );
}

export default function Profile() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
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

  // null = belum diubah, jadi tampilkan nilai dari profil
  const [nick, setNick] = useState(null);
  const [fav, setFav] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [confirmReset, setConfirmReset] = useState(false);

  if (authLoading) return <Skeleton className="h-64" />;
  if (!user) {
    return (
      <Empty title="Masuk untuk melihat profilmu">
        <p>
          Profil menyimpan nama panggilan, bioskop favorit, dan tiketmu di satu
          akun.
        </p>
        <button type="button" onClick={signIn} className={`${btnPrimary} mt-4`}>
          Masuk dengan Google
        </button>
      </Empty>
    );
  }

  const savedNick = profile?.nickname || "";
  const savedFav = profile?.favorite_cinema_id
    ? String(profile.favorite_cinema_id)
    : "";
  const nickValue = nick ?? savedNick;
  const favValue = fav ?? savedFav;
  const dirty = nickValue.trim() !== savedNick || favValue !== savedFav;

  async function onSave(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await save({
        nickname: nickValue,
        favorite_cinema_id: favValue ? Number(favValue) : null,
      });
      if (favValue) select(favValue); // bioskop favorit langsung dipakai sebagai pilihan
      setNick(null);
      setFav(null);
      setMsg({ ok: true, text: "Profil disimpan." });
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
      setNick(null);
      setFav(null);
      setConfirmReset(false);
      setMsg({
        ok: true,
        text: "Profil direset. Nama panggilan kembali memakai nama dari akun Google.",
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
  const now = Date.now();
  let stats = null;
  let upcoming = [];
  if (orders && promoMap) {
    const perCinema = {};
    let seatCount = 0;
    let spent = 0;
    for (const o of orders) {
      seatCount += o.seats.length;
      spent += orderTotals(
        o.seats,
        o.showtime,
        o.promo_code ? promoMap?.[o.promo_code] : null,
        o.deal_percent,
      ).total;
      const name = o.showtime.cinemas?.name;
      if (name) perCinema[name] = (perCinema[name] || 0) + 1;
    }
    const top = Object.entries(perCinema).sort((a, b) => b[1] - a[1])[0];
    stats = {
      orderCount: orders.length,
      seatCount,
      spent,
      topCinema: top ? top[0] : "-",
    };
    upcoming = orders
      .filter((o) => new Date(o.showtime.starts_at) > now)
      .sort(
        (a, b) =>
          new Date(a.showtime.starts_at) - new Date(b.showtime.starts_at),
      )
      .slice(0, 3);
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        Profil
      </h1>

      <section className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <Avatar user={user} size={64} />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold leading-tight tracking-tight">
            {displayName(user)}
          </p>
          {user.email && (
            <p className="mt-1 truncate text-sm text-ink-2">{user.email}</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Masuk lewat Google
            {user.created_at && ` · bergabung ${fmtJoined(user.created_at)}`}
          </p>
        </div>
      </section>

      <section aria-labelledby="stat-judul">
        <SectionTitle id="stat-judul">Ringkasan pesananmu</SectionTitle>
        {ordersError ? (
          <ErrorBox message={ordersError} onRetry={reload} />
        ) : !stats ? (
          <Skeleton className="h-24" />
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Pesanan" value={stats.orderCount} />
            <Stat label="Kursi dipesan" value={stats.seatCount} />
            <Stat
              label="Total belanja (simulasi, setelah diskon & promo)"
              value={rupiah(stats.spent)}
            />
            <Stat label="Bioskop terfavorit" value={stats.topCinema} />
          </dl>
        )}
      </section>

      <section aria-labelledby="tiket-judul">
        <SectionTitle
          id="tiket-judul"
          aside={
            <Link
              to="/riwayat"
              className="text-sm font-semibold text-accent-ink underline"
            >
              Semua riwayat
            </Link>
          }
        >
          Tiket mendatang
        </SectionTitle>
        {upcoming.length === 0 ? (
          <p className="nb-card p-4 text-sm text-muted">
            Belum ada tiket untuk jadwal yang akan datang.{" "}
            <Link to="/" className="font-semibold text-accent-ink underline">
              Cari film
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((o) => (
              <li key={o.code}>
                <Link
                  to={`/tiket/${o.code}`}
                  className="block nb-card p-4 transition-colors hover:border-line-hover hover:bg-raised"
                >
                  <p className="text-base font-semibold leading-tight tracking-tight">
                    {o.showtime.movies.title}
                  </p>
                  <p className="mt-1 text-xs capitalize text-muted">
                    {fmtDate(o.showtime.starts_at)} ·{" "}
                    {fmtTime(o.showtime.starts_at)}
                    {o.showtime.cinemas && ` · ${cinemaLabel(o.showtime)}`}
                  </p>
                  <p className="mt-1 text-sm">
                    Kursi {sortSeats(o.seats).join(", ")} ·{" "}
                    <span className="tnum text-muted">{o.code}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        onSubmit={onSave}
        aria-labelledby="atur-judul"
        className="space-y-4 nb-card p-5"
      >
        <h2 id="atur-judul" className="text-lg font-bold tracking-tight">
          Pengaturan
        </h2>

        {profileError && (
          <p
            role="alert"
            className="rounded-lg bg-danger-bg p-3 text-sm text-danger"
          >
            Profil tidak bisa dimuat: {profileError}. Pastikan file{" "}
            <code>supabase-profile.sql</code> sudah dijalankan.
          </p>
        )}

        <div>
          <label
            htmlFor="nick"
            className="block text-sm font-semibold text-ink-2"
          >
            Nama panggilan
          </label>
          <input
            id="nick"
            value={nickValue}
            onChange={(e) => setNick(e.target.value)}
            maxLength={30}
            disabled={profileLoading || busy}
            placeholder={`Kosong = pakai nama dari Google`}
            className={`mt-1 ${fieldCls}`}
          />
          <p className="mt-1 text-xs text-faint">
            Dipakai otomatis saat checkout dan tercetak di tiket. Nama ini
            tersimpan di data pesanan.
          </p>
        </div>

        <div>
          <label
            htmlFor="fav"
            className="block text-sm font-semibold text-ink-2"
          >
            Bioskop favorit
          </label>
          <select
            id="fav"
            value={favValue}
            onChange={(e) => setFav(e.target.value)}
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
          <p className="mt-1 text-xs text-faint">
            Jadi pilihan awal di beranda, juga di perangkat lain yang kamu pakai
            masuk.
          </p>
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
          className={btnPrimary}
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
            <span className="flex items-center gap-2 text-sm">
              Yakin reset profil?
              <button
                type="button"
                onClick={onReset}
                disabled={busy}
                className="min-h-11 rounded-lg border border-danger px-3 font-semibold text-danger hover:bg-danger-bg"
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
              Reset profil
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
