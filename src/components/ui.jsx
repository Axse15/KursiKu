import { useState } from "react";
import { scoreLabel } from "../lib/config";

// Tombol utama: warna aksen, bingkai tebal, bayangan keras kecil. "Naik" saat disentuh dan "menekan" saat diklik.
export const btnPrimary =
  "nb-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-edge bg-accent px-5 text-sm font-bold text-on-accent shadow-nb hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

export const btnGhost =
  "nb-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-edge bg-panel px-5 text-sm font-bold text-ink shadow-nb hover:bg-raised disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

// Kotak isian: bingkai 2px seperti kartu
export const fieldCls =
  "min-h-11 w-full rounded-xl border-2 border-edge bg-panel px-3 text-sm text-ink placeholder:text-faint focus-visible:shadow-nb";

// Warna petak bento (nilai sebenarnya ada di index.css, berganti otomatis di tema gelap)
export const TONES = {
  yellow: "bg-tile-yellow",
  pink: "bg-tile-pink",
  blue: "bg-tile-blue",
  green: "bg-tile-green",
  lilac: "bg-tile-lilac",
  orange: "bg-tile-orange",
  plain: "bg-panel",
};

// Lencana kecil bermakna khusus (diskon, label rilis): selalu warna aksen
export function Sticker({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border-2 border-edge bg-accent px-2 py-0.5 text-xs font-bold leading-tight text-on-accent ${className}`}
    >
      {children}
    </span>
  );
}

// Penanda kecil berwarna pastel (merek bioskop, format studio, genre)
export function Chip({ tone = "plain", children, className = "", title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-lg border-2 border-edge px-2 py-0.5 text-xs font-bold leading-tight text-ink ${TONES[tone] || TONES.plain} ${className}`}
    >
      {children}
    </span>
  );
}

// Judul bagian. Level h2 kecuali ditentukan lain.
export function SectionTitle({
  id,
  level = 2,
  children,
  sub = null,
  aside = null,
  className = "",
}) {
  const H = `h${level}`;
  return (
    <div className={`mb-5 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <H
          id={id}
          className="text-2xl font-extrabold tracking-tight sm:text-3xl"
        >
          {children}
        </H>
        {aside}
      </div>
      {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl border-2 border-line bg-raised ${className}`}
    />
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-danger-line bg-danger-bg p-4 text-sm"
    >
      <p className="font-semibold text-danger">Terjadi kesalahan</p>
      <p className="mt-1 text-ink-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="nb-lift mt-3 min-h-10 rounded-xl border-2 border-edge bg-ink px-4 text-sm font-bold text-page"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="nb-card p-8 text-center sm:p-10">
      <p className="font-display text-xl font-extrabold tracking-tight">
        {title}
      </p>
      <div className="mt-2 text-sm text-muted">{children}</div>
    </div>
  );
}

// Cahaya lembut di poster pengganti dan hero, supaya gradasinya tidak terlihat datar.
export function Texture() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.22), transparent 55%)",
      }}
    />
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
  framed = true,
}) {
  const [broken, setBroken] = useState(false);
  const photo = movie.poster_url && !broken;

  return (
    <div
      role="img"
      aria-label={`Poster ${movie.title}`}
      className={`relative overflow-hidden rounded-xl ${framed ? "border-2 border-edge" : ""} ${className}`}
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
            className={`pointer-events-none absolute select-none font-display font-black leading-none text-white/10 ${compact ? "-right-1 -top-1 text-5xl" : "-right-3 -top-6 text-[11rem]"}`}
          >
            {movie.title[0]}
          </span>
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent"
          />
          {!compact && (
            <div className="absolute inset-x-0 bottom-0 p-3">
              <span className="font-display text-xl font-extrabold leading-tight tracking-tight text-white">
                {movie.title}
              </span>
            </div>
          )}
        </>
      )}

      {showMeta && (
        <>
          <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur">
            {movie.genre}
          </span>
          <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
            {scoreLabel(movie)}
          </span>
        </>
      )}
    </div>
  );
}
