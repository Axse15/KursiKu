import { CITIES } from "./nearby";

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Semua kata di pencarian harus ada (urutan bebas) di salah satu bagian teks.
const matches = (q, ...fields) => {
  const hay = norm(fields.filter(Boolean).join(" | "));
  return norm(q)
    .split(" ")
    .filter(Boolean)
    .every((w) => hay.includes(w));
};

const castNames = (m) =>
  Array.isArray(m.cast_members) ? m.cast_members.map((c) => c?.name) : [];

// Cari film (judul, genre, sutradara, pemeran), bioskop KursiKu (nama, kota, alamat), dan kota.
// Judul yang diawali kata pencarian ditaruh paling atas.
export function searchAll(query, movies = [], cinemas = []) {
  const q = norm(query);
  if (!q) return { films: [], cinemas: [], cities: [] };

  const films = movies
    .filter((m) =>
      matches(q, m.title, m.genre, m.genres, m.director, ...castNames(m)),
    )
    .sort((a, b) => {
      const sa = norm(a.title).startsWith(q)
        ? 0
        : norm(a.title).includes(q)
          ? 1
          : 2;
      const sb = norm(b.title).startsWith(q)
        ? 0
        : norm(b.title).includes(q)
          ? 1
          : 2;
      return sa - sb || b.id - a.id;
    });

  const places = cinemas.filter((c) => matches(q, c.name, c.city, c.address));

  const cityNames = new Set(
    [...CITIES.map((c) => c.name), ...cinemas.map((c) => c.city)].filter(
      Boolean,
    ),
  );
  const cities = [...cityNames].filter((name) => matches(q, name)).sort();

  return { films, cinemas: places, cities };
}
