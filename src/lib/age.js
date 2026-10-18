// Klasifikasi usia film. Di Indonesia resminya dari Lembaga Sensor Film (LSF): SU (semua umur), 13+, 17+, 21+.
// Data yang kita punya bukan dari LSF, jadi labelnya DITURUNKAN dari sumber lain dan ditandai "perkiraan":
//   1. sertifikasi Indonesia dari TMDB ("SU", "13+", "17+", "21+")
//   2. sertifikasi Amerika dari TMDB atau OMDb (G, PG, PG-13, R, NC-17, TV-MA, ...) dipetakan ke label LSF
//   3. kalau keduanya kosong: perkiraan kasar dari genre (Horor/Kriminal/Perang -> 17+, Animasi/Keluarga -> SU, lainnya 13+)
// Perkiraan ini bukan klasifikasi resmi; bioskop sungguhan menentukan sendiri berdasarkan keputusan LSF.

export const AGE_LONG = {
  SU: "Semua umur",
  "13+": "Remaja, 13 tahun ke atas",
  "17+": "Dewasa, 17 tahun ke atas",
  "21+": "Dewasa, 21 tahun ke atas",
};

const US_MAP = {
  G: "SU",
  "TV-Y": "SU",
  "TV-Y7": "SU",
  "TV-G": "SU",
  PG: "13+",
  "TV-PG": "13+",
  "PG-13": "13+",
  "TV-14": "13+",
  R: "17+",
  "TV-MA": "17+",
  "NC-17": "21+",
  X: "21+",
};

const clean = (v) =>
  String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

// Label LSF dari teks sertifikasi apa pun. null = tidak dikenali.
export function labelFromCertification(raw) {
  const c = clean(raw);
  if (!c) return null;
  if (c === "SU" || c === "ALLAGES" || c === "A") return "SU";
  const num = c.match(/^(?:D|R)?(\d{1,2})\+?$/); // "13+", "D17+", "R13", "17"
  if (num) {
    const n = Number(num[1]);
    if (n >= 21) return "21+";
    if (n >= 17) return "17+";
    if (n >= 13) return "13+";
    return "SU";
  }
  return US_MAP[c] || null;
}

const ADULT_GENRES = /horor|horror|kriminal|crime|perang|war|thriller/i;
const KIDS_GENRES = /animasi|animation|keluarga|family|anak/i;

// Hasil: { label, long, estimate, source } atau null kalau tidak ada dasar sama sekali.
export function ageOf(movie) {
  if (!movie) return null;
  const fromCert = labelFromCertification(movie.certification);
  const fromOmdb = labelFromCertification(movie.age_rated);
  const label = fromCert || fromOmdb;
  if (label) {
    return {
      label,
      long: AGE_LONG[label],
      estimate: true,
      source: fromCert ? "TMDB" : "OMDb",
    };
  }
  const genres = `${movie.genres || ""} ${movie.genre || ""}`;
  if (!genres.trim() || genres.trim() === "Film") return null;
  const guess = KIDS_GENRES.test(genres)
    ? "SU"
    : ADULT_GENRES.test(genres)
      ? "17+"
      : "13+";
  return {
    label: guess,
    long: AGE_LONG[guess],
    estimate: true,
    source: "genre",
  };
}

export const ageNote = (age) =>
  !age
    ? ""
    : age.source === "genre"
      ? "Perkiraan dari genre film, bukan klasifikasi resmi LSF."
      : `Dipetakan dari klasifikasi ${age.source}, bukan keputusan resmi LSF.`;

// Penonton boleh masuk? Dipakai untuk menandai film dewasa (17+ ke atas).
export const isAdultOnly = (age) =>
  !!age && (age.label === "17+" || age.label === "21+");
