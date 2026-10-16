import { Link } from "react-router-dom";
import { Poster } from "./ui";

// Kartu film. Poster membawa penanda (status rilis, nilai, diskon); teks di bawahnya hanya yang perlu:
// judul, genre + durasi, lalu satu baris kiri/kanan (mis. jadwal terdekat + harga).
export default function MovieCard({
  movie,
  tag = null,
  deal = null,
  left,
  right,
  note = null,
}) {
  return (
    <Link to={`/film/${movie.id}`} className="group block rounded-xl">
      <div className="relative overflow-hidden rounded-xl shadow-lg shadow-black/30">
        <Poster
          movie={movie}
          showMeta={false}
          className="aspect-[2/3] rounded-xl transition duration-300 group-hover:scale-[1.03]"
        />
        {tag && (
          <span
            className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-bold ${
              tag === "new"
                ? "bg-accent text-on-accent"
                : "border border-white/50 bg-black/70 text-white backdrop-blur"
            }`}
          >
            {tag === "new" ? "Baru rilis" : "Segera hadir"}
          </span>
        )}
        {movie.vote_average ? (
          <span className="absolute right-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            ★ {Number(movie.vote_average).toFixed(1)}
          </span>
        ) : null}
        {deal && (
          <span className="absolute bottom-2 left-2 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-on-accent shadow">
            −{deal.pct}% · {deal.day}
          </span>
        )}
      </div>

      <h3 className="mt-3 line-clamp-1 font-display text-base font-semibold leading-snug">
        {movie.title}
      </h3>
      <p className="mt-0.5 line-clamp-1 text-xs text-muted">
        {movie.genre} · {movie.duration_min} mnt
      </p>
      {note && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{note}</p>}
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-t border-line pt-2 text-xs">
        <span className="font-medium text-accent-ink">{left}</span>
        <span className="font-semibold">{right}</span>
      </div>
    </Link>
  );
}
