import { ratingOf } from "./rank";

// Sistem Penunjang Keputusan (SPK) untuk halaman Film terlaris, metode SAW (Simple Additive Weighting).
// Murni hitungan (tanpa jaringan) supaya mudah diuji.
//
// Langkah SAW:
//   1. Matriks keputusan X: tiap film (alternatif) punya nilai untuk tiap kriteria.
//   2. Normalisasi: untuk kriteria "benefit" (makin besar makin baik) r = x / nilai terbesar di kriteria itu. Hasilnya 0 sampai 1.
//   3. Bobot W: tiap kriteria diberi bobot, dijumlahkan jadi 100%.
//   4. Skor V = jumlah (bobot x r). Film dengan V tertinggi di peringkat 1.
// Keempat kriteria di bawah semuanya benefit, jadi tidak ada rumus "cost".

export const CRITERIA = [
  {
    key: "tickets",
    label: "Tiket terjual",
    hint: "Jumlah kursi yang terjual dalam periode terpilih",
    weight: 40,
  },
  {
    key: "orders",
    label: "Jumlah pesanan",
    hint: "Berapa kali film ini dipesan (satu pesanan bisa banyak kursi)",
    weight: 20,
  },
  {
    key: "recent",
    label: "Tren 7 hari",
    hint: "Kursi terjual dalam 7 hari terakhir: film yang sedang naik",
    weight: 25,
  },
  {
    key: "rating",
    label: "Rating penonton",
    hint: "Nilai 0-10 dari IMDb, atau TMDB kalau IMDb tidak ada",
    weight: 15,
  },
];

export const DEFAULT_WEIGHTS = Object.fromEntries(
  CRITERIA.map((c) => [c.key, c.weight]),
);

// Bobot dari slider (0-100 tiap kriteria) diubah jadi pecahan yang totalnya 1.
// Semua 0 = tidak ada pilihan, jadi dianggap sama rata.
export function normalizeWeights(raw) {
  const sum = CRITERIA.reduce(
    (s, c) => s + Math.max(0, Number(raw[c.key]) || 0),
    0,
  );
  if (sum === 0)
    return {
      weights: Object.fromEntries(
        CRITERIA.map((c) => [c.key, 1 / CRITERIA.length]),
      ),
      equalFallback: true,
    };
  return {
    weights: Object.fromEntries(
      CRITERIA.map((c) => [c.key, Math.max(0, Number(raw[c.key]) || 0) / sum]),
    ),
    equalFallback: false,
  };
}

// Gabungkan daftar film dengan angka penjualan dari database (movie_sales).
// sales: [{ movie_id, tickets, orders, recent_tickets }]. Film yang ikut = film yang laku di periode ini atau sedang tayang.
export function buildAlternatives(movies, sales, nowShowingIds) {
  const byMovie = new Map(sales.map((s) => [Number(s.movie_id), s]));
  const showing = new Set(nowShowingIds);
  return movies
    .filter((m) => byMovie.has(m.id) || showing.has(m.id))
    .map((m) => {
      const s = byMovie.get(m.id);
      return {
        movie: m,
        values: {
          tickets: s ? Number(s.tickets) : 0,
          orders: s ? Number(s.orders) : 0,
          recent: s ? Number(s.recent_tickets) : 0,
          rating: ratingOf(m) ?? 0,
        },
      };
    });
}

// Hitung SAW. Mengembalikan baris yang sudah diurutkan (peringkat 1 di depan) plus nilai maksimum tiap kriteria.
export function saw(alternatives, rawWeights) {
  const { weights, equalFallback } = normalizeWeights(rawWeights);
  const max = Object.fromEntries(
    CRITERIA.map((c) => [
      c.key,
      Math.max(0, ...alternatives.map((a) => a.values[c.key])),
    ]),
  );
  const rows = alternatives.map((a) => {
    const norm = {};
    let score = 0;
    for (const c of CRITERIA) {
      norm[c.key] = max[c.key] > 0 ? a.values[c.key] / max[c.key] : 0;
      score += weights[c.key] * norm[c.key];
    }
    return { ...a, norm, score };
  });
  // seri: tiket lebih banyak dulu, lalu rating, lalu film yang lebih baru
  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.values.tickets - a.values.tickets ||
      b.values.rating - a.values.rating ||
      b.movie.id - a.movie.id,
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return { rows, max, weights, equalFallback };
}

// Film dengan tiket terjual terbanyak (murni penjualan, tanpa bobot). Null kalau belum ada penjualan.
export function topByTickets(rows) {
  const best = [...rows].sort(
    (a, b) =>
      b.values.tickets - a.values.tickets || b.values.recent - a.values.recent,
  )[0];
  return best && best.values.tickets > 0 ? best : null;
}
