import { supabase, unwrap } from "./supabase";
import { useAsync } from "./useAsync";
import { dealPercent, dealPrice } from "./deals";
import { releaseInfo } from "./release";

// "Sedang tayang" = film yang punya jadwal dalam 3 hari ke depan.
// Dibatasi 3 hari supaya jumlah barisnya kecil (batas bawaan Supabase 1000 baris per permintaan).
const WINDOW_MS = 3 * 86400000;

// Data film + ringkasan jadwal, dipakai beranda, Sedang tayang, Coming soon, dan Pencarian.
// cinemaId = null berarti semua bioskop.
export function useFilms(cinemaId = null) {
  const state = useAsync(async () => {
    const movies = unwrap(
      await supabase.from("movies").select("*").order("id"),
    );

    // Supabase membatasi 1000 baris per permintaan. Dengan banyak film, jadwal 3 hari bisa lebih dari itu,
    // jadi diambil per halaman 1000 baris (maksimal 5 halaman) supaya tidak ada film yang diam-diam hilang.
    const now = Date.now();
    const PAGE = 1000;
    const shows = [];
    for (let from = 0; from < 5 * PAGE; from += PAGE) {
      let q = supabase
        .from("showtimes")
        .select("movie_id, cinema_id, starts_at, price_regular")
        .gte("starts_at", new Date(now).toISOString())
        .lt("starts_at", new Date(now + WINDOW_MS).toISOString())
        .order("starts_at")
        .order("id")
        .range(from, from + PAGE - 1);
      if (cinemaId) q = q.eq("cinema_id", cinemaId);
      const part = unwrap(await q);
      shows.push(...part);
      if (part.length < PAGE) break;
    }

    // jadwal terdekat per film + bioskop mana saja yang menayangkannya
    const next = {};
    const where = {};
    const fromPrice = {}; // harga reguler termurah per film, sudah termasuk diskon film harian
    const bestDeal = {}; // diskon film terbesar dalam 3 hari ini: { pct, at }
    for (const s of shows) {
      if (!next[s.movie_id]) next[s.movie_id] = s.starts_at;
      (where[s.movie_id] ||= new Set()).add(s.cinema_id);
      const pct = dealPercent(s.movie_id, s.starts_at);
      const price = dealPrice(s.price_regular, pct);
      if (!(s.movie_id in fromPrice) || price < fromPrice[s.movie_id])
        fromPrice[s.movie_id] = price;
      if (pct > (bestDeal[s.movie_id]?.pct || 0))
        bestDeal[s.movie_id] = { pct, at: s.starts_at };
    }
    return { movies, next, where, fromPrice, bestDeal };
  }, [cinemaId]);

  // turunan: status rilis tiap film, daftar sedang tayang, dan daftar segera hadir
  let derived = null;
  if (state.data) {
    const { movies, next } = state.data;
    const info = {};
    for (const m of movies) info[m.id] = releaseInfo(m);
    const upcoming = movies
      .filter((m) => info[m.id].status === "soon")
      .sort((a, b) => info[a.id].days - info[b.id].days || b.id - a.id);
    const nowShowing = movies.filter(
      (m) => next[m.id] && info[m.id].status !== "soon",
    );
    derived = { info, upcoming, nowShowing };
  }
  return { ...state, ...(state.data || {}), ...(derived || {}) };
}
