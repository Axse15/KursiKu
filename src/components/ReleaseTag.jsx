import { fmtReleaseShort } from "../lib/release";

// Penanda rilis di halaman film / banner. onDark = dipakai di atas gambar gelap (warna tetap, tidak ikut tema).
export default function ReleaseTag({ info, onDark = false, className = "" }) {
  const base = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`;
  if (info.status === "new")
    return (
      <span className={`${base} bg-accent text-on-accent`}>Baru rilis</span>
    );
  if (info.status === "soon") {
    return (
      <span
        className={`${base} border ${onDark ? "border-amber-300 text-amber-300" : "border-accent-ink text-accent-ink"}`}
      >
        Segera hadir · {fmtReleaseShort(info.date)}
      </span>
    );
  }
  return null;
}
