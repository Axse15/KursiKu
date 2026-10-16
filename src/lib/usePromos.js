import { supabase, unwrap } from "./supabase";
import { useAsync } from "./useAsync";

// Kode promo yang bisa dipakai HARI INI oleh akun yang sedang login: kode yang "terbuka" hari ini (acak per hari)
// dan belum pernah dipakai akun itu (sekali pakai). Pengunjung tanpa login melihat semua kode yang terbuka hari ini.
// Keputusannya diambil database lewat todays_promos() (supabase-v8.sql), jadi tampilan dan penjaga di server
// selalu sepaham. Gagal/fungsi belum ada -> error, pemanggil yang memutuskan.
export function usePromos() {
  return useAsync(
    async () => unwrap(await supabase.rpc("todays_promos")) || [],
    [],
  );
}

// Semua promo, termasuk yang sudah nonaktif, dalam bentuk { KODE: promo }. Untuk menghitung ulang total tiket lama.
export function usePromoMap() {
  return useAsync(async () => {
    try {
      const rows = unwrap(await supabase.from("promos").select("*"));
      return Object.fromEntries(rows.map((p) => [p.code, p]));
    } catch {
      return {}; // tanpa data promo, tiket tetap tampil (hanya potongan yang tidak terhitung)
    }
  }, []);
}
