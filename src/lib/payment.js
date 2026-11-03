// Pembayaran tiruan (demo tugas kuliah). Tidak ada uang yang diproses dan tidak ada koneksi ke bank atau penyedia QRIS.
// Isi QR sengaja BUKAN format QRIS sungguhan (EMV), supaya aplikasi bank tidak mengiranya tagihan asli.

export const PAY_TTL_MS = 10 * 60 * 1000 // batas waktu bayar: 10 menit
// QRIS dan e-wallet: pembayaran "terdeteksi" sendiri setelah jeda acak 10-20 detik, tanpa perlu menekan tombol
export const AUTO_MIN_MS = 10000
export const AUTO_MAX_MS = 20000

export const METHODS = [
  { id: 'qris', label: 'QRIS', auto: true },
  { id: 'bank', label: 'Transfer bank / mobile banking', auto: false },
  { id: 'ewallet', label: 'E-wallet', auto: true },
]

// Bank yang bisa dipilih untuk transfer lewat mobile banking. Hanya nama (tanpa logo): ini simulasi, bukan kerja sama dengan bank mana pun.
export const BANKS = [
  { id: 'bca', name: 'BCA' },
  { id: 'mandiri', name: 'Mandiri' },
  { id: 'bni', name: 'BNI' },
  { id: 'bri', name: 'BRI' },
  { id: 'bsi', name: 'BSI' },
  { id: 'cimb', name: 'CIMB Niaga' },
  { id: 'permata', name: 'Permata' },
  { id: 'danamon', name: 'Danamon' },
  { id: 'btn', name: 'BTN' },
  { id: 'ocbc', name: 'OCBC' },
  { id: 'jago', name: 'Bank Jago' },
  { id: 'seabank', name: 'SeaBank' },
]

// Nomor virtual account tiap bank berbeda, seperti aslinya: dua digit setelah awalan 9999 menunjukkan bank yang dipilih.
// Awalan 9999 tetap dipertahankan supaya nomornya tidak pernah cocok dengan rekening sungguhan.
export const bankVa = (va, bank) => {
  const code = String(Math.max(0, BANKS.findIndex((b) => b.id === bank.id)) + 1).padStart(2, '0')
  return va.slice(0, 4) + code + va.slice(6)
}

const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // tanpa huruf/angka yang mirip (O/0, I/1)

function randomInts(n, max) {
  const out = []
  try {
    const buf = new Uint32Array(n)
    crypto.getRandomValues(buf)
    for (const v of buf) out.push(v % max)
  } catch {
    for (let i = 0; i < n; i++) out.push(Math.floor(Math.random() * max))
  }
  return out
}

export const makePayRef = () => 'KK' + randomInts(8, ALNUM.length).map((i) => ALNUM[i]).join('')

// Nomor virtual account tiruan: awalan 9999 tidak dipakai bank mana pun, jadi tidak bisa salah bayar ke rekening orang.
export const makeVa = () => {
  const d = randomInts(12, 10).join('')
  return `9999${d}`
}

export const fmtVa = (va) => va.replace(/(\d{4})(?=\d)/g, '$1 ')

// Isi QR: teks biasa yang jelas menyebut simulasi.
export const qrPayload = ({ ref, amount }) => `KURSIKU-SIMULASI|${ref}|IDR${amount}|BUKAN-PEMBAYARAN-ASLI`

// paidAt = kapan pembayaran QR "terdeteksi" (dipakai PaymentPanel untuk metode QRIS/e-wallet)
export function newPayment(total) {
  const now = Date.now()
  const wait = AUTO_MIN_MS + randomInts(1, AUTO_MAX_MS - AUTO_MIN_MS + 1)[0]
  return { ref: makePayRef(), va: makeVa(), amount: total, expiresAt: now + PAY_TTL_MS, paidAt: now + wait }
}

export function fmtCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
