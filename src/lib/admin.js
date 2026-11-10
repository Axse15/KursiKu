import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

// ---------------------------------------------------------------------------
// Panel admin: pemeriksaan peran dan pemanggilan fungsi admin_* di Supabase.
// Yang MENJAGA keamanan adalah database (setiap fungsi admin_* memeriksa peran di sisi server).
// Pemeriksaan di sini hanya untuk menentukan apa yang ditampilkan.
// ---------------------------------------------------------------------------

// nama kolom dari kode galat "input_invalid:<kolom>"
const FIELD = {
  code: "Kode",
  title: "Judul",
  description: "Deskripsi",
  percent_off: "Persen diskon (1 sampai 70)",
  max_discount: "Maksimal potongan (Rp1.000 ke atas)",
  min_seats: "Minimal kursi (1 sampai 10)",
  weekdays: "Hari berlaku",
  valid_until: "Berlaku sampai",
  daily_chance: "Peluang buka harian (0 sampai 100)",
  genre: "Genre",
  duration_min: "Durasi (menit)",
  synopsis: "Sinopsis (minimal 10 huruf)",
  release_date: "Tanggal rilis",
  trailer_key: "Kode trailer YouTube (11 karakter)",
  poster_url: "Alamat poster (harus https://)",
  backdrop_url: "Alamat gambar latar (harus https://)",
  age_rated: "Rating usia",
  director: "Sutradara",
  movie_id: "Film",
  cinema_id: "Bioskop",
  starts_at: "Waktu tayang",
  studio: "Studio",
  price_regular: "Harga reguler (Rp5.000 sampai Rp500.000)",
  price_premium: "Harga premium (Rp5.000 sampai Rp500.000)",
  name: "Nama",
  city: "Kota",
  address: "Alamat",
  lat: "Lintang (-90 sampai 90)",
  lon: "Bujur (-180 sampai 180)",
  delta: "Jumlah poin",
  note: "Alasan (3 sampai 120 huruf)",
  reason: "Alasan",
};

const MESSAGES = {
  admin_only: "Akun ini bukan admin.",
  admin_self: "Kamu tidak bisa mencabut akses admin akunmu sendiri.",
  promo_exists: "Kode promo itu sudah ada. Pakai kode lain.",
  promo_not_found: "Promo tidak ditemukan.",
  promo_used:
    "Promo ini sudah pernah dipakai pembeli, jadi tidak bisa dihapus. Nonaktifkan saja.",
  movie_not_found: "Film tidak ditemukan.",
  movie_tmdb_locked:
    "Film dari TMDB tidak bisa diubah atau dihapus. Kamu hanya bisa menyembunyikannya.",
  movie_has_orders:
    "Film ini sudah punya pesanan, jadi tidak bisa dihapus. Sembunyikan saja.",
  showtime_exists: "Jadwal dengan film, bioskop, dan jam yang sama sudah ada.",
  showtime_not_found: "Jadwal tidak ditemukan.",
  showtime_has_orders: "Jadwal ini sudah dipesan. Batalkan pesanannya dulu.",
  cinema_exists: "Nama bioskop itu sudah dipakai.",
  cinema_not_found: "Bioskop tidak ditemukan.",
  cinema_has_orders:
    "Bioskop ini sudah punya pesanan, jadi tidak bisa dihapus.",
  order_not_found: "Pesanan dengan kode itu tidak ditemukan.",
  order_checked_in:
    "Tiket pesanan ini sudah dipindai di pintu masuk, jadi tidak bisa dibatalkan. Batalkan validasinya dulu.",
  points_insufficient:
    "Saldo poin pengguna tidak cukup untuk dikurangi sebanyak itu.",
  user_not_found: "Pengguna tidak ditemukan.",
};

// Teks galat Supabase -> kalimat yang bisa dipahami admin
export function adminError(err) {
  const raw = String(err?.message || err || "");
  const inv = raw.match(/input_invalid:([a-z_]+)/);
  if (inv) return `Isian "${FIELD[inv[1]] || inv[1]}" tidak valid.`;
  for (const [code, text] of Object.entries(MESSAGES))
    if (raw.includes(code)) return text;
  if (/could not find the function|schema cache|does not exist/i.test(raw))
    return "Fungsi admin belum ada di database. Jalankan file supabase-v12.sql di Supabase SQL Editor.";
  if (/failed to fetch|network|load failed/i.test(raw))
    return "Tidak bisa terhubung ke server. Periksa koneksi internetmu.";
  if (/jwt|not authenticated|permission denied/i.test(raw))
    return "Sesi habis atau tidak punya izin. Masuk lagi lalu coba lagi.";
  return raw || "Terjadi kesalahan.";
}

// Panggil fungsi admin_*; galat sudah diterjemahkan ke bahasa Indonesia.
export async function call(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const e = new Error(adminError(error));
    e.raw = error.message;
    throw e;
  }
  return data;
}

// Status admin per akun, diingat selama halaman terbuka supaya menu akun dan penjaga halaman tidak bertanya dua kali.
const known = new Map();

// { admin, checking }: admin = true kalau akun yang login terdaftar sebagai admin.
export function useIsAdmin() {
  const { user, loading } = useAuth();
  const uid = user?.id || null;
  const [, bump] = useState(0);

  useEffect(() => {
    if (!uid || known.has(uid)) return undefined;
    let dead = false;
    supabase.rpc("is_admin").then(({ data, error }) => {
      known.set(uid, !error && data === true);
      if (!dead) bump((n) => n + 1);
    });
    return () => {
      dead = true;
    };
  }, [uid]);

  if (loading) return { admin: false, checking: true };
  if (!uid) return { admin: false, checking: false };
  if (!known.has(uid)) return { admin: false, checking: true };
  return { admin: known.get(uid), checking: false };
}

// Setelah keluar, jangan simpan status akun lama.
export function forgetAdmin() {
  known.clear();
}

// ---- format tampilan ----
const WIB = "Asia/Jakarta";
export const fmtDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: WIB,
      })
        .format(new Date(iso))
        .replace(/\./g, ":")
    : "-";
export const fmtShortDate = (isoOrYmd) =>
  isoOrYmd
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        timeZone: WIB,
      }).format(
        new Date(
          String(isoOrYmd).length === 10
            ? `${isoOrYmd}T12:00:00+07:00`
            : isoOrYmd,
        ),
      )
    : "-";
export const fmtLongDate = (ymd) =>
  ymd
    ? new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: WIB,
      }).format(new Date(`${ymd}T12:00:00+07:00`))
    : "-";
export const num = (n) => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

// Nilai <input type="datetime-local"> (waktu Jakarta) <-> teks waktu ISO
export const toLocalInput = (iso) => {
  if (!iso) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: WIB,
  })
    .formatToParts(new Date(iso))
    .reduce((a, x) => ({ ...a, [x.type]: x.value }), {});
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
};
export const fromLocalInput = (v) => (v ? `${v}:00+07:00` : "");

// Hari ini (YYYY-MM-DD) menurut waktu Jakarta
export const todayYmd = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: WIB }).format(new Date());
