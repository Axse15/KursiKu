import { fmtReleaseShort } from "../lib/release";
import { Sticker } from "./ui";

// Penanda rilis di halaman film / banner. onDark = dipakai di atas gambar gelap (warna tetap, tidak ikut tema).
export default function ReleaseTag({ info, onDark = false, className = "" }) {
  if (info.status === "new")
    return <Sticker className={className}>Baru rilis</Sticker>;
  if (info.status === "soon") {
    return (
      <span
        className={`inline-flex items-center rounded-lg border-2 px-2 py-0.5 text-xs font-bold ${
          onDark
            ? "border-white text-white"
            : "border-edge bg-tile-lilac text-ink"
        } ${className}`}
      >
        Segera hadir · {fmtReleaseShort(info.date)}
      </span>
    );
  }
  return null;
}
