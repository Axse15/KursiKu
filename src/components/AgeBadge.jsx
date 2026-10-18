import { ageNote, ageOf } from "../lib/age";

// Penanda usia penonton (SU / 13+ / 17+ / 21+). Selalu perkiraan, jadi ada keterangan di title dan di halaman film.
// onPhoto = dipakai di atas poster/foto gelap (warna tetap, tidak ikut tema).
export default function AgeBadge({
  movie,
  age = undefined,
  onPhoto = false,
  className = "",
}) {
  const a = age === undefined ? ageOf(movie) : age;
  if (!a) return null;
  return (
    <span
      title={`${a.long}. ${ageNote(a)}`}
      aria-label={`Klasifikasi usia ${a.label}: ${a.long} (perkiraan)`}
      className={`inline-flex min-w-9 items-center justify-center rounded-lg border-2 px-1.5 py-0.5 text-xs font-extrabold leading-tight ${
        onPhoto
          ? "border-white bg-black/80 text-white"
          : "border-edge bg-panel text-ink"
      } ${className}`}
    >
      {a.label}
    </span>
  );
}
