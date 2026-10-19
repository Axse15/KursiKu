import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

// Profil pengguna yang sudah login: nama panggilan, bioskop favorit, data diri, dan foto profil.
// Disimpan di tabel "profiles" (hanya pemiliknya yang bisa membaca/mengubah, diatur oleh RLS di database).
const ProfileContext = createContext({
  enabled: false, // false = di luar ProfileProvider
  profile: null,
  loading: false,
  error: "",
  save: async () => {},
  reset: async () => {},
});

// Nama berkas foto profil di Storage: satu berkas per akun, ditimpa kalau ganti foto.
export const avatarPath = (uid) => `${uid}/avatar.jpg`;

// Merapikan isian sebelum dikirim ke database. Hanya kolom yang ada di `patch` yang ikut dikirim,
// jadi menyimpan satu bagian (mis. foto) tidak menghapus bagian lain.
const clean = {
  nickname: (v) => (v || "").trim().slice(0, 30) || null,
  full_name: (v) => (v || "").trim().slice(0, 60) || null,
  phone: (v) => (v || "").replace(/[\s\-().]/g, "") || null, // 0812-3456-7890 -> 081234567890
  birth_date: (v) => v || null,
  gender: (v) => v || null,
  city: (v) => (v || "").trim().slice(0, 40) || null,
  favorite_cinema_id: (v) => (v ? Number(v) : null),
  avatar_url: (v) => v || null,
};

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setProfile(null);
    setError("");
    if (!uid) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(err.message);
        else setProfile(data);
      })
      .catch((e) => active && setError(e.message || "Gagal memuat profil"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [uid]);

  // Simpan (buat kalau belum ada, ubah kalau sudah ada). Melempar error supaya halaman bisa menampilkannya.
  const save = useCallback(
    async (patch) => {
      if (!uid) throw new Error("Kamu belum masuk.");
      const row = { id: uid };
      for (const key of Object.keys(clean))
        if (key in patch) row[key] = clean[key](patch[key]);
      const { data, error: err } = await supabase
        .from("profiles")
        .upsert(row, { onConflict: "id" })
        .select()
        .single();
      if (err) throw err;
      setProfile(data);
      setError("");
      return data;
    },
    [uid],
  );

  const reset = useCallback(async () => {
    if (!uid) return;
    const { error: err } = await supabase
      .from("profiles")
      .delete()
      .eq("id", uid);
    if (err) throw err;
    // berkas foto ikut dihapus (kalau gagal, tidak apa-apa: profilnya sudah terhapus)
    await supabase.storage
      .from("avatars")
      .remove([avatarPath(uid)])
      .catch(() => {});
    setProfile(null);
  }, [uid]);

  const value = useMemo(
    () => ({ enabled: true, profile, loading, error, save, reset }),
    [profile, loading, error, save, reset],
  );
  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
