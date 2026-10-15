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
      className="flex items-center justify-center rounded-full bg-amber-400 font-bold text-zinc-950"
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
        className="h-8 w-20 animate-pulse rounded-lg bg-zinc-800"
      />
    );

  return (
    <div className="relative">
      {user ? (
        <div className="flex items-center gap-1">
          <Link
            to="/profil"
            aria-label={`Profil ${displayName(user)}`}
            className="flex min-h-11 items-center gap-2 rounded-lg px-1 hover:text-amber-400"
          >
            <Avatar user={user} />
            <span className="hidden max-w-32 truncate text-sm text-zinc-200 sm:inline">
              {displayName(user)}
            </span>
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 rounded-lg px-2 text-sm text-zinc-400 hover:text-amber-400"
          >
            Keluar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={signIn}
          aria-label="Masuk dengan Google"
          className="min-h-11 rounded-xl border border-zinc-600 px-3 text-sm font-medium text-zinc-100 hover:border-amber-400"
        >
          <span className="sm:hidden">Masuk</span>
          <span className="hidden sm:inline">Masuk dengan Google</span>
        </button>
      )}

      {authError && (
        <p
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-red-500/40 bg-red-950 p-3 text-xs text-red-200 shadow-lg"
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
