import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

// Login Google lewat Supabase Auth. Sesi disimpan otomatis di browser,
// jadi setelah login sekali, pengunjung langsung masuk tanpa mengisi apa pun.
const RETURN_KEY = "kursiku_return_to";

// Dicek sekali saat file dimuat (sebelum Supabase sempat merapikan alamat halaman).
// Kalau halaman ini BUKAN hasil kembali dari Google, sisa "halaman tujuan" lama dibuang.
const CAME_FROM_LOGIN =
  typeof window !== "undefined" &&
  /[?&](code|error)=/.test(window.location.search);
if (!CAME_FROM_LOGIN) {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* abaikan */
  }
}

const AuthContext = createContext({
  enabled: false, // false = di luar AuthProvider (mis. layar "konfigurasi belum diisi")
  user: null,
  loading: false,
  authError: "",
  clearError: () => {},
  signIn: async () => {},
  signOut: async () => {},
});

// Nama tampilan dari akun Google (nama lengkap, atau bagian depan email kalau tidak ada)
export function displayName(user) {
  const m = user?.user_metadata || {};
  return (
    m.full_name ||
    m.name ||
    user?.email?.split("@")[0] ||
    "Pengguna"
  ).trim();
}
export const firstName = (user) => displayName(user).split(/\s+/)[0];
export const avatarUrl = (user) =>
  user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

// Kalau Google/Supabase mengembalikan error, alasannya ada di alamat halaman (?error_description=...)
function errorFromUrl() {
  try {
    const p = new URLSearchParams(
      window.location.search + "&" + window.location.hash.replace(/^#/, ""),
    );
    return p.get("error_description") || p.get("error") || "";
  } catch {
    return "";
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate); // useNavigate berganti identitas tiap pindah halaman; jangan jadikan dependency
  navigateRef.current = navigate;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(errorFromUrl);

  useEffect(() => {
    let active = true;

    // getSession menunggu proses "tukar kode login" selesai kalau pengguna baru kembali dari Google
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setUser(data?.session?.user ?? null);
      })
      .catch(
        (e) =>
          active && setAuthError(e.message || "Gagal memeriksa sesi login"),
      )
      .finally(() => active && setLoading(false));

    // Jangan memanggil API Supabase di dalam callback ini (bisa membuat macet). Cukup simpan state.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_IN") {
        // kembalikan pengguna ke halaman tempat dia menekan "Masuk"
        let back = "";
        try {
          back = sessionStorage.getItem(RETURN_KEY) || "";
          sessionStorage.removeItem(RETURN_KEY);
        } catch {
          /* abaikan */
        }
        if (back.startsWith("/") && !back.startsWith("//"))
          navigateRef.current(back, { replace: true });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setAuthError("");
    try {
      sessionStorage.setItem(
        RETURN_KEY,
        window.location.pathname + window.location.search,
      );
    } catch {
      /* abaikan */
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setAuthError(error.message);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }, []);

  const clearError = useCallback(() => setAuthError(""), []);

  const value = useMemo(
    () => ({
      enabled: true,
      user,
      loading,
      authError,
      clearError,
      signIn,
      signOut,
    }),
    [user, loading, authError, clearError, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
