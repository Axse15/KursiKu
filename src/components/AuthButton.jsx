import { useState } from "react";
import { Link } from "react-router-dom";
import { avatarUrl, displayName, useAuth } from "../lib/auth";

// Foto profil Google, atau huruf pertama nama kalau fotonya tidak bisa dimuat.
export function Avatar({ user, size = 32 }) {
  const [broken, setBroken] = useState(false);
  const src = avatarUrl(user);
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
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...box, fontSize: size / 2.2 }}
      className="flex items-center justify-center rounded-full bg-accent font-bold text-on-accent"
    >
      {displayName(user)[0]?.toUpperCase()}
    </span>
  );
}

// Tombol masuk / keluar di header. Tidak tampil sama sekali kalau di luar AuthProvider.
export default function AuthButton() {
  const { enabled, user, loading, authError, clearError, signIn, signOut } =
    useAuth();
  if (!enabled) return null;

  if (loading)
    return (
      <span
        aria-hidden="true"
        className="h-8 w-20 animate-pulse rounded-lg bg-raised"
      />
    );

  return (
    <div className="relative">
      {user ? (
        <div className="flex items-center gap-1">
          <Link
            to="/profil"
            aria-label={`Profil ${displayName(user)}`}
            className="flex min-h-11 items-center gap-2 rounded-lg px-1 hover:text-accent-ink"
          >
            <Avatar user={user} />
            <span className="hidden max-w-32 truncate text-sm text-ink-2 md:inline">
              {displayName(user)}
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 rounded-lg px-2 text-sm text-muted hover:text-accent-ink"
          >
            Keluar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={signIn}
          aria-label="Masuk dengan Google"
          className="min-h-11 rounded-xl border border-line-hover px-3 text-sm font-medium text-ink hover:border-accent"
        >
          <span className="sm:hidden">Masuk</span>
          <span className="hidden sm:inline">Masuk dengan Google</span>
        </button>
      )}

      {authError && (
        <p
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-danger-line bg-danger-bg p-3 text-xs text-danger shadow-lg"
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
