// Diskon film harian: setiap hari tayang (menurut waktu Jakarta), sekitar 1 dari 5 film mendapat potongan harga
// 10-30%. Filmnya berganti tiap hari. Semua fungsi murni dan deterministik: film dan tanggal yang sama
// selalu memberi hasil yang sama, jadi tidak perlu tabel atau tugas terjadwal di database.
//
// Ini SIMULASI: potongan dihitung di aplikasi. Besarnya dicatat di kolom bookings.deal_percent saat membeli,
// sehingga total tiket lama tidak ikut berubah kalau aturan di file ini diubah kelak.

export const DEAL_RATE = 0.2 // peluang sebuah film dapat diskon pada hari tertentu
export const DEAL_PERCENTS = [10, 15, 20, 25, 30]

// "2026-10-15" menurut waktu Jakarta (UTC+7, tanpa waktu musim panas)
export const wibDay = (startsAt) => new Date(new Date(startsAt).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)

// hash 32-bit (FNV-1a + pengaduk akhir) supaya hasilnya tersebar rata
export function hash32(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

/** Persen diskon film itu untuk jadwal yang mulai pada `startsAt`. 0 = tidak ada diskon. */
export function dealPercent(movieId, startsAt) {
  if (movieId == null || !startsAt) return 0
  const h = hash32(`kursiku|deal|${wibDay(startsAt)}|${movieId}`)
  if ((h % 1000) / 1000 >= DEAL_RATE) return 0
  return DEAL_PERCENTS[(h >>> 10) % DEAL_PERCENTS.length]
}

/** Harga setelah diskon, dibulatkan ke Rp1.000 terdekat supaya angkanya rapi. */
export function dealPrice(price, percent) {
  if (!percent) return price
  return Math.max(1000, Math.round((price * (100 - percent)) / 100 / 1000) * 1000)
}
