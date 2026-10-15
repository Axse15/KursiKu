// Peringkat film untuk banner beranda. Murni (tanpa jaringan) supaya mudah diuji.
//
// Catatan jujur: "paling banyak ditonton" memakai skor POPULARITAS dari TMDB (gabungan penayangan halaman,
// favorit, dan daftar tonton pengguna TMDB di seluruh dunia). Itu bukan jumlah tiket terjual,
// karena KursiKu hanya simulasi dan data pesanannya terlalu sedikit untuk dijadikan peringkat.

const num = (v) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

// Nilai 0-10: pakai IMDb kalau ada, kalau tidak nilai TMDB.
export const ratingOf = (m) => num(m.imdb_rating) ?? num(m.vote_average);

const popOf = (m) => num(m.popularity) ?? num(m.vote_count) ?? 0;

const byDesc = (key) => (a, b) => key(b) - key(a) || b.id - a.id; // seri: film yang lebih baru masuk dulu

export function topPopular(movies, n = 3) {
  return [...movies].sort(byDesc(popOf)).slice(0, n);
}

// Film dengan suara terlalu sedikit (mis. 3 suara semuanya 10) tidak adil kalau disebut "rating bagus".
export function topRated(movies, n = 3, minVotes = 25) {
  const rated = movies.filter((m) => ratingOf(m) != null && ratingOf(m) > 0);
  const solid = rated.filter(
    (m) => (num(m.imdb_votes) ?? num(m.vote_count) ?? minVotes) >= minVotes,
  );
  const pool = solid.length >= n ? solid : rated; // kalau yang cukup suara terlalu sedikit, longgarkan
  return [...pool].sort(byDesc((m) => ratingOf(m))).slice(0, n);
}

// Gabungan: 60% rating, 40% popularitas (skala log supaya satu film viral tidak menenggelamkan yang lain).
// Rating "dihaluskan" dengan jumlah suara (rata-rata berbobot): nilai 10 dari 2 suara tidak mengalahkan nilai 8 dari 2.000 suara.
const PRIOR_MEAN = 6.5;
const PRIOR_VOTES = 50;
function shrunkRating(m) {
  const r = ratingOf(m);
  if (r == null) return PRIOR_MEAN;
  const v = num(m.imdb_votes) ?? num(m.vote_count) ?? PRIOR_VOTES;
  return (v * r + PRIOR_VOTES * PRIOR_MEAN) / (v + PRIOR_VOTES);
}

export function topRecommended(movies, n = 3) {
  const maxPop = Math.max(1, ...movies.map((m) => popOf(m)));
  const score = (m) =>
    0.6 * (shrunkRating(m) / 10) +
    0.4 * (Math.log1p(popOf(m)) / Math.log1p(maxPop));
  return [...movies].sort(byDesc(score)).slice(0, n);
}
