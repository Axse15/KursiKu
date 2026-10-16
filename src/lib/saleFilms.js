// Film yang sedang diskon, dikelompokkan per hari. Murni (tanpa jaringan) supaya mudah diuji.
// Diskon film harian dihitung di lib/deals.js: film dan tanggal (WIB) yang sama selalu memberi persen yang sama,
// jadi semua jadwal film itu pada hari itu memakai persen yang sama.
import { dealPercent, dealPrice, wibDay } from "./deals";

/**
 * shows: [{ movie_id, cinema_id, starts_at, price_regular }]
 * Hasil: [{ day: '2026-10-16', at: <iso jadwal paling awal hari itu>, items: [{ movieId, pct, price, regular, first, cinemas }] }]
 * - hanya jadwal yang belum lewat
 * - hari diurutkan dari yang terdekat; di dalam hari: diskon terbesar dulu, lalu harga termurah
 * - price = harga reguler termurah setelah diskon, regular = harga reguler jadwal yang sama sebelum diskon
 */
export function collectSaleFilms(shows, now = Date.now()) {
  const days = new Map();
  for (const s of shows) {
    if (!(Date.parse(s.starts_at) >= now)) continue;
    const pct = dealPercent(s.movie_id, s.starts_at);
    if (!pct) continue;
    const day = wibDay(s.starts_at);
    const byMovie = days.get(day) || new Map();
    days.set(day, byMovie);
    const price = dealPrice(s.price_regular, pct);
    const cur = byMovie.get(s.movie_id);
    if (!cur) {
      byMovie.set(s.movie_id, {
        movieId: s.movie_id,
        pct,
        price,
        regular: s.price_regular,
        first: s.starts_at,
        cinemas: new Set([s.cinema_id]),
      });
    } else {
      cur.cinemas.add(s.cinema_id);
      if (s.starts_at < cur.first) cur.first = s.starts_at;
      if (price < cur.price) {
        cur.price = price;
        cur.regular = s.price_regular;
      }
    }
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, byMovie]) => {
      const items = [...byMovie.values()].sort(
        (a, b) => b.pct - a.pct || a.price - b.price || a.movieId - b.movieId,
      );
      const at = items.reduce(
        (min, it) => (it.first < min ? it.first : min),
        items[0].first,
      );
      return { day, at, items };
    });
}
