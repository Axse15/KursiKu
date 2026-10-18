import { useEffect, useState } from "react";
import { supabase, unwrap } from "./supabase";

// Daftar film untuk pencarian di header. Dimuat sekali (saat pengguna mulai mengetik) dan dipakai ulang.
let cache = null;
let inflight = null;

export function loadCatalog() {
  if (cache) return Promise.resolve(cache);
  inflight ||= Promise.resolve(supabase.from("movies").select("*").order("id"))
    .then((res) => {
      cache = unwrap(res);
      return cache;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// start = false: belum memuat (dipakai supaya halaman tidak memanggil database sebelum pencarian dipakai)
export function useCatalog(start = true) {
  const [state, setState] = useState({
    movies: cache || [],
    loading: !cache && start,
    error: "",
  });
  useEffect(() => {
    if (!start || cache) {
      if (cache) setState({ movies: cache, loading: false, error: "" });
      return undefined;
    }
    let off = false;
    setState((s) => ({ ...s, loading: true }));
    loadCatalog().then(
      (movies) => !off && setState({ movies, loading: false, error: "" }),
      (e) =>
        !off &&
        setState({
          movies: [],
          loading: false,
          error: e.message || "Gagal memuat film.",
        }),
    );
    return () => {
      off = true;
    };
  }, [start]);
  return state;
}
