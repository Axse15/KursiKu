// Diskon film harian: setiap hari tayang (waktu Jakarta), sekitar 1 dari 5 film dapat diskon 10-30%.
// Deterministik: film dan tanggal yang sama selalu memberi hasil yang sama.
// SIMULASI: besarnya dicatat di bookings.deal_percent saat membeli.

export const DEAL_RATE = 0.2;
export const DEAL_PERCENTS = [10, 15, 20, 25, 30];

export const wibDay = (startsAt) =>
  new Date(new Date(startsAt).getTime() + 7 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function dealPercent(movieId, startsAt) {
  if (movieId == null || !startsAt) return 0;
  const h = hash32(`kursiku|deal|${wibDay(startsAt)}|${movieId}`);
  if ((h % 1000) / 1000 >= DEAL_RATE) return 0;
  return DEAL_PERCENTS[(h >>> 10) % DEAL_PERCENTS.length];
}

export function dealPrice(price, percent) {
  if (!percent) return price;
  return Math.max(
    1000,
    Math.round((price * (100 - percent)) / 100 / 1000) * 1000,
  );
}
