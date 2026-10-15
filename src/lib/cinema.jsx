import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { supabase, unwrap } from "./supabase";
import { useAsync } from "./useAsync";
import { useProfile } from "./profile";

// Daftar bioskop dimuat sekali, dan pilihan pengguna diingat di browser ini.
// Isi penyimpanan: ''(belum pernah memilih) | 'all'(sengaja memilih "Semua bioskop") | id bioskop.
const KEY = "kursiku_cinema";
const ALL = "all";

const CinemaContext = createContext({
  cinemas: [],
  selected: null,
  select: () => {},
  loading: false,
  error: null,
  reload: () => {},
});

function readSaved() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function CinemaProvider({ children }) {
  const { data, loading, error, reload } = useAsync(
    async () => unwrap(await supabase.from("cinemas").select("*").order("id")),
    [],
  );
  const { profile } = useProfile();
  const [savedId, setSavedId] = useState(readSaved);

  const cinemas = useMemo(() => data || [], [data]);

  // Belum pernah memilih di perangkat ini -> pakai bioskop favorit dari profil (kalau ada).
  // Kalau bioskop yang tersimpan sudah tidak ada, otomatis kembali ke "Semua bioskop".
  const favoriteId = profile?.favorite_cinema_id
    ? String(profile.favorite_cinema_id)
    : "";
  const effectiveId = savedId === ALL ? "" : savedId || favoriteId;
  const selected = cinemas.find((c) => String(c.id) === effectiveId) || null;

  const select = useCallback((id) => {
    const v = id == null ? ALL : String(id);
    setSavedId(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* penyimpanan diblokir: pilihan tetap jalan selama halaman terbuka */
    }
  }, []);

  const value = useMemo(
    () => ({ cinemas, selected, select, loading, error, reload }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cinemas, effectiveId, loading, error],
  );
  return (
    <CinemaContext.Provider value={value}>{children}</CinemaContext.Provider>
  );
}

export const useCinema = () => useContext(CinemaContext);
