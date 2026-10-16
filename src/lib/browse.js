// Mengelompokkan film berdasarkan apakah tayang di bioskop terdekat. Murni, mudah diuji.
// where[movieId] = Set id bioskop yang menayangkan film itu.

// Cabang KursiKu lebih jauh dari ini dianggap "bukan terdekat sungguhan" (mis. pengguna di Medan, cabang terdekat di Jawa).
export const NEAR_MAX_KM = 100;

export function splitByNearest(list, where, nearestId) {
  if (nearestId == null) return { here: list, elsewhere: [], split: false };
  const id = String(nearestId);
  const here = [];
  const elsewhere = [];
  for (const m of list) {
    const set = where[m.id];
    const present = set ? [...set].some((c) => String(c) === id) : false;
    (present ? here : elsewhere).push(m);
  }
  return { here, elsewhere, split: true };
}

// Nama kota tempat film tayang, tanpa duplikat: "Bandung, Surabaya"
export function citiesOf(movieId, where, cityById) {
  const out = [];
  for (const c of where[movieId] || []) {
    const city = cityById[String(c)];
    if (city && !out.includes(city)) out.push(city);
  }
  return out.join(", ");
}
