// Sinkronisasi film OTOMATIS: ambil film sedang tayang + segera hadir dari TMDB, lalu kirim langsung ke Supabase
// (fungsi sync_movies dari supabase-v11.sql). Tidak ada import.sql yang perlu ditempel dengan tangan.
//
// Dijalankan tiap hari oleh GitHub Actions (.github/workflows/otomatis.yml). Bisa juga dijalankan sendiri:
//   node scripts/sync-tmdb.mjs
// Kunci dibaca dari environment (GitHub Secrets) atau dari file .env.import untuk percobaan di komputermu:
//   TMDB_TOKEN=<API Read Access Token TMDB>             WAJIB
//   SUPABASE_URL=<alamat proyek Supabase>               WAJIB (sama dengan VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_KEY=<kunci "secret" / service_role> WAJIB. KUNCI INI SANGAT SENSITIF: jangan pernah masuk ke
//                                                        repo, ke .env biasa, atau ke Environment Variables Vercel.
//   OMDB_KEY, TRAKT_CLIENT_ID                           opsional (rating IMDb, jumlah penonton Trakt)
import { createClient } from '@supabase/supabase-js'
import { COUNT, ID_COUNT, UPCOMING_COUNT, fetchMovies, readEnv, toRow } from './import-tmdb.mjs'

const MIN_FILMS = 10 // kurang dari ini dianggap TMDB bermasalah: tidak ada yang dikirim, tidak ada yang dihapus

function fail(msg) {
  console.error('Gagal:', msg)
  process.exit(1)
}

const token = readEnv('TMDB_TOKEN')
const url = readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL')
const key = readEnv('SUPABASE_SERVICE_KEY')
if (!token) fail('TMDB_TOKEN belum diisi.')
if (!url) fail('SUPABASE_URL belum diisi.')
if (!key) fail('SUPABASE_SERVICE_KEY belum diisi.')

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

// 1. Bangunkan Supabase dulu. Satu permintaan ke database tiap hari juga yang menjaga proyek gratis tidak "tidur".
{
  const { error } = await supabase.from('movies').select('id').limit(1)
  if (error) fail(`Supabase tidak bisa dihubungi: ${error.message}`)
  console.log('Supabase aktif.')
}

// 2. Ambil film dari TMDB (+ OMDb dan Trakt kalau kuncinya ada)
const omdbKey = readEnv('OMDB_KEY')
const traktKey = readEnv('TRAKT_CLIENT_ID')
let items
try {
  items = await fetchMovies(token, COUNT, ID_COUNT, { omdbKey, upcoming: UPCOMING_COUNT, traktKey })
} catch (e) {
  fail(`TMDB: ${e.message}`)
}
if (items.length < MIN_FILMS) fail(`TMDB hanya memberi ${items.length} film (minimal ${MIN_FILMS}). Tidak ada yang diubah di database.`)

// 3. Kirim ke Supabase. Satu panggilan = satu transaksi: memperbarui film, membuang film lama yang belum pernah dipesan,
//    lalu membuat jadwal 7 hari. Kalau gagal di tengah, database tetap seperti semula.
const { data, error } = await supabase.rpc('sync_movies', { items: items.map(toRow), prune: true })
if (error) {
  const hint = /sync_movies/.test(error.message) && /(find|exist|schema cache)/i.test(error.message) ? ' Jalankan supabase-v11.sql di SQL Editor dulu.' : ''
  fail(`sync_movies: ${error.message}.${hint}`)
}

const nSoon = items.filter((m) => m.soon).length
console.log(`Selesai: ${data.film_diterima} film disinkronkan (${items.length - nSoon} sedang tayang, ${nSoon} segera hadir), ${data.film_dibuang} film lama dibuang, ${data.jadwal_baru} jadwal baru dibuat.`)
for (const m of items) console.log(` - ${m.title}${m.soon ? ` (rilis ${m.release_date})` : ''}`)
