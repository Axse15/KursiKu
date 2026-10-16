// Memilih film untuk banner beranda: satu slide per kategori (Lagi promo, Rating bagus, Paling populer, Baru rilis, Segera hadir).
// Murni dan deterministik: tanggal (waktu Jakarta) yang sama selalu memberi pilihan yang sama, dan berganti otomatis tiap hari,
// jadi tidak perlu tabel atau tugas terjadwal. Dalam satu kategori film dipilih dari 3 teratas, urutan kategorinya juga berputar.
import { hash32 } from "./deals";
import { todayWib } from "./release";
import { topPopular, topRated, hasWatchers } from "./rank";

export const KINDS = ["promo", "rating", "populer", "baru", "segera"];
const POOL = 3; // film dipilih dari N teratas tiap kategori

export function buildFeatured({
  nowShowing,
  upcoming,
  info,
  bestDeal,
  now = new Date(),
}) {
  const day = todayWib(now);
  const dayNo = Math.floor(Date.parse(`${day}T00:00:00Z`) / 864e5);

  const pools = {
    promo: nowShowing
      .filter((m) => bestDeal[m.id]?.pct > 0)
      .sort((a, b) => bestDeal[b.id].pct - bestDeal[a.id].pct || b.id - a.id),
    rating: topRated(nowShowing, POOL + 2),
    populer: topPopular(nowShowing, POOL + 2),
    baru: nowShowing
      .filter((m) => info[m.id]?.status === "new")
      .sort((a, b) => info[a.id].days - info[b.id].days || b.id - a.id),
    segera: [...upcoming].sort(
      (a, b) => info[a.id].days - info[b.id].days || b.id - a.id,
    ),
  };

  // kategori yang berisi diputar tiap hari supaya slide pertama tidak itu-itu saja
  const kinds = KINDS.filter((k) => pools[k].length > 0);
  const shift = kinds.length ? dayNo % kinds.length : 0;
  const ordered = [...kinds.slice(shift), ...kinds.slice(0, shift)];

  const used = new Set();
  const slides = [];
  for (const kind of ordered) {
    const pool = pools[kind].filter((m) => !used.has(m.id)).slice(0, POOL);
    if (pool.length === 0) continue;
    const movie = pool[hash32(`kursiku|banner|${day}|${kind}`) % pool.length];
    used.add(movie.id);
    // peringkat film di kategorinya (untuk tulisan besar "#1", "#2", ...)
    const rank =
      kind === "rating" || kind === "populer"
        ? pools[kind].indexOf(movie) + 1
        : null;
    slides.push({
      kind,
      movie,
      deal: kind === "promo" ? bestDeal[movie.id] : null,
      info: info[movie.id],
      rank,
      byWatchers: kind === "populer" && hasWatchers(nowShowing),
    });
  }
  return slides;
}
