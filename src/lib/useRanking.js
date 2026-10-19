import { supabase, unwrap } from "./supabase";
import { useAsync } from "./useAsync";
import { useFilms } from "./films";
import { DEFAULT_WEIGHTS, buildAlternatives, saw } from "./spk";

// Peringkat film terlaris, dipakai halaman Terlaris dan beranda.
// Penilaian selalu memakai penjualan 30 hari terakhir dan bobot bawaan (lihat spk.js); pengunjung hanya melihat hasilnya.
export const RANK_DAYS = 30;

// Mengembalikan { rows, loading, error, reload }. rows = film urut dari peringkat 1, atau null selama masih memuat.
export function useRanking() {
  const films = useFilms(null);
  const sales = useAsync(
    async () =>
      unwrap(await supabase.rpc("movie_sales", { p_days: RANK_DAYS })) || [],
    [],
  );

  const error = films.error || sales.error || "";
  const loading =
    (films.loading && !films.data) || (sales.loading && !sales.data);

  let rows = null;
  if (films.data && sales.data) {
    const alts = buildAlternatives(
      films.movies,
      sales.data,
      films.nowShowing.map((m) => m.id),
    );
    rows = saw(alts, DEFAULT_WEIGHTS).rows;
  }

  const reload = () => {
    films.reload();
    sales.reload();
  };
  return { rows, loading, error, reload };
}
