// Peringkat film untuk banner beranda. Murni (tanpa jaringan) supaya mudah diuji.
//
// Catatan jujur: "paling banyak ditonton" BUKAN jumlah tiket KursiKu (itu simulasi, datanya terlalu sedikit).
//   - Kalau ada kolom watchers (diisi skrip impor dari API Trakt): jumlah pengguna Trakt di seluruh dunia yang menonton film itu minggu ini.
//   - Kalau tidak ada: skor popularitas TMDB (gabungan penayangan halaman, favorit, dan daftar tonton pengguna TMDB).

const num = (v) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

// Nilai 0-10: pakai IMDb kalau ada, kalau tidak nilai TMDB.
export const ratingOf = (m) => num(m.imdb_rating) ?? num(m.vote_average);

const popOf = (m) => num(m.popularity) ?? num(m.vote_count) ?? 0;

const byDesc = (key) => (a, b) => key(b) - key(a) || b.id - a.id; // seri: film yang lebih baru masuk dulu

export const watchersOf = (m) => {
  const v = num(m.watchers);
  return v != null && v > 0 ? v : null;
};

// Ada cukup film dengan data penonton Trakt? Kalau ya, hanya film itu yang diperingkat (skala Trakt dan TMDB tidak bisa dicampur).
export const hasWatchers = (movies, n = 3) =>
  movies.filter((m) => watchersOf(m) != null).length >= n;

export function topPopular(movies, n = 3) {
  if (hasWatchers(movies))
    return movies
      .filter((m) => watchersOf(m) != null)
      .sort(byDesc(watchersOf))
      .slice(0, n);
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
