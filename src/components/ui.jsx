import { useState } from "react";
import { scoreLabel } from "../lib/config";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40";

export const btnGhost =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-line-strong px-5 font-medium text-ink hover:border-accent";

export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-raised ${className}`}
    />
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger-line bg-danger-bg p-4 text-sm"
    >
      <p className="font-medium text-danger">Terjadi kesalahan</p>
      <p className="mt-1 text-ink-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 min-h-10 rounded-lg bg-ink px-4 font-medium text-page"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-8 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <div className="mt-2 text-sm text-muted">{children}</div>
    </div>
  );
}

// Tekstur butiran film (noise SVG buatan sendiri, bukan gambar dari luar).
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

// Cahaya + butiran film. Dipakai di poster dan hero supaya tidak terlihat datar.
export function Texture() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.25), transparent 55%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{ backgroundImage: NOISE }}
      />
    </>
  );
}

// Gambar latar yang menghilang sendiri kalau gagal dimuat (mis. diblokir jaringan).
// Di bawahnya tetap ada gradasi, jadi tampilan tidak pernah rusak.
export function Backdrop({ src }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setBroken(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

// Poster: pakai gambar dari TMDB kalau ada, kalau tidak (atau gagal dimuat) pakai poster gradasi buatan sendiri.
export function Poster({
  movie,
  className = "",
  showMeta = true,
  compact = false,
}) {
  const [broken, setBroken] = useState(false);
  const photo = movie.poster_url && !broken;

  return (
    <div
      role="img"
      aria-label={`Poster ${movie.title}`}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: `linear-gradient(160deg, ${movie.poster_from}, ${movie.poster_to})`,
      }}
    >
      {photo ? (
        <img
          src={movie.poster_url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <Texture />
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute select-none font-display font-bold leading-none text-white/10 ${compact ? "-right-1 -top-1 text-4xl" : "-right-4 -top-8 text-[9rem]"}`}
          >
            {movie.title[0]}
          </span>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent"
          />
          {!compact && (
            <div className="absolute inset-x-0 bottom-0 p-3">
              <span className="font-display text-lg font-bold leading-tight text-white">
                {movie.title}
              </span>
            </div>
          )}
        </>
      )}

      {showMeta && (
        <>
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            {movie.genre}
          </span>
          <span className="absolute right-3 top-3 rounded-md border border-white/50 bg-black/40 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {scoreLabel(movie)}
          </span>
        </>
      )}
    </div>
  );
}
