import { Chip } from "./ui";

// Warna tetap per merek supaya mudah dikenali: XXI kuning, CGV merah muda, Cinépolis biru, dst.
const BRAND_TONE = {
  XXI: "yellow",
  CGV: "pink",
  Cinépolis: "blue",
  Flix: "green",
  Movimax: "lilac",
  Platinum: "orange",
  Cinemaxx: "blue",
};

// Penanda bioskop: merek (CGV, XXI, ...) lalu format layarnya (IMAX, 4DX, ...). Hanya yang terdeteksi dari data peta; tidak ditebak.
export default function CinemaTags({
  brand = null,
  formats = [],
  className = "",
}) {
  if (!brand && formats.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {brand && <Chip tone={BRAND_TONE[brand] || "plain"}>{brand}</Chip>}
      {formats.map((f) => (
        <Chip key={f} tone="plain" title={`Format ${f}`}>
          {f}
        </Chip>
      ))}
    </span>
  );
}
