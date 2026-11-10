import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { avatarUrl, displayName, rememberReturn, useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { forgetAdmin, useIsAdmin } from "../lib/admin";

// Foto profil: foto yang diunggah di halaman Profil, atau foto akun Google, atau huruf pertama nama kalau tidak ada / gagal dimuat.
export function Avatar({ user, size = 32 }) {
  const { profile } = useProfile();
  const src = profile?.avatar_url || avatarUrl(user);
  const name = profile?.full_name || displayName(user);
  // key = alamat foto, supaya status "gagal dimuat" ikut direset saat foto diganti
  return <AvatarImage key={src} src={src} name={name} size={size} />;
}

function AvatarImage({ src, name, size }) {
  const [broken, setBroken] = useState(false);
  const box = { width: size, height: size };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={box}
        referrerPolicy="no-referrer" // foto profil Google sering gagal dimuat tanpa ini
        onError={() => setBroken(true)}
        className="shrink-0 rounded-full border-2 border-edge object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: size / 2.2 }}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-edge bg-accent font-bold text-on-accent"
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

// Menu akun di header: foto + nama membuka daftar kecil (Profil, Riwayat pesanan, Keluar). Belum login: tombol Daftar dan Masuk.
// Tidak tampil sama sekali kalau di luar AuthProvider.
export default function AuthButton() {
  const { enabled, user, loading, authError, clearError, signOut } = useAuth();
  const { profile } = useProfile();
  const { admin } = useIsAdmin();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  // menu menutup sendiri saat pindah halaman, klik di luar, atau menekan Escape
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!enabled) return null;

  if (loading)
    return (
      <span
        aria-hidden="true"
        className="h-10 w-20 animate-pulse rounded-xl bg-raised"
      />
    );

  const shownName = profile?.full_name || displayName(user);
  const item =
    "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-bold text-ink hover:bg-raised";

  return (
    <div ref={wrapRef} className="relative">
      {user ? (
        <>
          <button
            ref={btnRef}
            type="button"
            aria-expanded={open}
            aria-haspopup="true"
            aria-controls="menu-akun"
            aria-label={`Menu akun ${shownName}`}
            onClick={() => setOpen((o) => !o)}
            className={`flex min-h-11 items-center gap-2 rounded-xl border-2 px-1.5 hover:bg-raised ${open ? "border-edge bg-raised" : "border-transparent"}`}
          >
            <Avatar user={user} />
            <span className="hidden max-w-28 truncate text-sm font-bold text-ink-2 lg:inline">
              {shownName}
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="hidden size-4 text-muted sm:block"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open && (
            <div
              id="menu-akun"
              className="nb-card absolute right-0 top-full z-50 mt-2 w-56 p-2"
            >
              <p className="truncate px-3 pb-2 pt-1 text-xs text-muted">
                Masuk sebagai {shownName}
              </p>
              <Link to="/profil" className={item}>
                Profil
              </Link>
              <Link to="/riwayat" className={item}>
                Riwayat pesanan
              </Link>
              {admin && (
                <Link to="/admin" className={`${item} bg-tile-lilac`}>
                  Panel admin
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  forgetAdmin();
                  signOut();
                }}
                className={`${item} mt-1 border-t-2 border-line pt-0.5 text-danger`}
              >
                Keluar
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-1.5">
          <Link
            to="/daftar"
            onClick={rememberReturn}
            className="hidden min-h-10 items-center rounded-xl border-2 border-transparent px-3 text-sm font-bold text-ink-2 hover:border-edge hover:bg-raised sm:flex"
          >
            Daftar
          </Link>
          <Link
            to="/masuk"
            onClick={rememberReturn}
            className="nb-lift flex min-h-10 items-center rounded-xl border-2 border-edge bg-ink px-4 text-sm font-bold text-page shadow-nb"
          >
            Masuk
          </Link>
        </div>
      )}

      {/* di halaman masuk/daftar, kesalahan login sudah tampil di bawah tombol Google */}
      {authError && pathname !== "/masuk" && pathname !== "/daftar" && (
        <p
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border-2 border-danger-line bg-page p-3 text-xs text-danger shadow-nb"
        >
          Login gagal: {authError}{" "}
          <button type="button" onClick={clearError} className="underline">
            Tutup
          </button>
        </p>
      )}
    </div>
  );
}
