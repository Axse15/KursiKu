import { supabase, unwrap } from "./supabase";
import { useAsync } from "./useAsync";

// Promo yang sedang aktif (untuk ditampilkan). Gagal/tabel belum ada -> error, pemanggil yang memutuskan.
export function usePromos() {
  return useAsync(
    async () =>
      unwrap(
        await supabase
          .from("promos")
          .select("*")
          .eq("active", true)
          .order("percent_off", { ascending: false }),
      ),
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
