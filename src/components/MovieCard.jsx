import { Link } from "react-router-dom";
import { ageOf } from "../lib/age";
import AgeBadge from "./AgeBadge";
import { Poster, Sticker } from "./ui";

// Kartu film: poster besar di atas, penanda kecil di atas poster (status rilis, nilai, diskon, usia),
// lalu judul, genre, dan satu baris info (jadwal terdekat di kiri, harga di kanan).
export default function MovieCard({
  movie,
  tag = null,
  deal = null,
  left,
  right,
  note = null,
}) {
  const age = ageOf(movie);
  return (
    <Link
      to={`/film/${movie.id}`}
      className="group nb-card nb-lift flex h-full flex-col overflow-hidden"
    >
      <div className="on-photo relative border-b-2 border-edge">
        <Poster
          movie={movie}
          showMeta={false}
          framed={false}
          className="aspect-[2/3] rounded-none"
        />
        {tag && (
          <span
            className={`absolute left-2 top-2 rounded-lg border-2 px-2 py-0.5 text-xs font-bold ${
              tag === "new"
                ? "border-edge bg-accent text-on-accent"
                : "border-white bg-black/80 text-white"
            }`}
          >
            {tag === "new" ? "Baru rilis" : "Segera hadir"}
          </span>
        )}
        {movie.vote_average ? (
          <span className="absolute right-2 top-2 rounded-lg border-2 border-white bg-black/80 px-1.5 py-0.5 text-xs font-bold text-white">
            ★ {Number(movie.vote_average).toFixed(1)}
          </span>
        ) : null}
        {deal && (
          <Sticker className="absolute bottom-2 left-2 z-10">
            −{deal.pct}% · {deal.day}
          </Sticker>
        )}
        {age && (
          <AgeBadge age={age} onPhoto className="absolute bottom-2 right-2" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 font-display text-base font-extrabold leading-snug tracking-tight">
          {movie.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">
          {movie.genre} · {movie.duration_min} mnt
        </p>
        {note && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{note}</p>
        )}
        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 pt-2 text-xs">
          <span className="font-bold text-accent-ink">{left}</span>
          <span className="tnum font-semibold text-ink-2">{right}</span>
        </div>
      </div>
    </Link>
  );
}
