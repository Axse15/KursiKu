import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { avatarUrl, displayName, rememberReturn, useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";

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

// Tombol masuk / daftar / keluar di header. Tidak tampil sama sekali kalau di luar AuthProvider.
export default function AuthButton() {
  const { enabled, user, loading, authError, clearError, signOut } = useAuth();
  const { profile } = useProfile();
  const { pathname } = useLocation();
  if (!enabled) return null;

  if (loading)
    return (
      <span
        aria-hidden="true"
        className="h-10 w-20 animate-pulse rounded-xl bg-raised"
      />
    );

  const shownName = profile?.full_name || displayName(user);

  return (
    <div className="relative">
      {user ? (
        <div className="flex items-center gap-1">
          <Link
            to="/profil"
            aria-label={`Profil ${shownName}`}
            className="flex min-h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-raised"
          >
            <Avatar user={user} />
            <span className="hidden max-w-32 truncate text-sm text-ink-2 md:inline">
              {shownName}
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 rounded-xl px-2 text-sm font-semibold text-ink-2 hover:bg-raised"
          >
            Keluar
          </button>
        </div>
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
