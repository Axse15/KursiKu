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

// Login lewat Supabase Auth: email + kata sandi (daftar sendiri) atau akun Google.
// Sesi disimpan otomatis di browser, jadi setelah login sekali, pengunjung langsung masuk tanpa mengisi apa pun.
const RETURN_KEY = "kursiku_return_to";
const AUTH_PATHS = ["/masuk", "/daftar"];

// Dicek sekali saat file dimuat (sebelum Supabase sempat merapikan alamat halaman).
// Kalau halaman ini BUKAN hasil kembali dari Google / tautan email, sisa "halaman tujuan" lama dibuang.
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

// Simpan halaman tempat pengunjung menekan "Masuk", supaya setelah login dia dikembalikan ke sana.
// Di halaman masuk/daftar sendiri tujuan yang sudah tersimpan dibiarkan.
export function rememberReturn() {
  if (AUTH_PATHS.includes(window.location.pathname)) return;
  try {
    sessionStorage.setItem(
      RETURN_KEY,
      window.location.pathname + window.location.search,
    );
  } catch {
    /* abaikan */
  }
}

// Ambil (dan hapus) halaman tujuan setelah login. Kosong kalau tidak ada atau tidak aman.
export function popReturn() {
  let back = "";
  try {
    back = sessionStorage.getItem(RETURN_KEY) || "";
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* abaikan */
  }
  const ok =
    back.startsWith("/") &&
    !back.startsWith("//") &&
    !AUTH_PATHS.includes(back.split("?")[0]);
  return ok ? back : "";
}

const AuthContext = createContext({
  enabled: false, // false = di luar AuthProvider (mis. layar "konfigurasi belum diisi")
  user: null,
  loading: false,
  authError: "",
  clearError: () => {},
  signIn: async () => {},
  signInEmail: async () => ({ error: "" }),
  signUpEmail: async () => ({ error: "", needsConfirm: false }),
  signOut: async () => {},
});

// Nama tampilan dari akun (nama lengkap yang diisi saat daftar / dari Google, atau bagian depan email)
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
// 'google' atau 'email'
export const providerOf = (user) => user?.app_metadata?.provider || "email";

// Pesan error Supabase Auth (bahasa Inggris) diterjemahkan supaya mudah dipahami.
const MESSAGES = [
  [/invalid login credentials/i, "Email atau kata sandi salah."],
  [
    /email not confirmed/i,
    "Emailmu belum dikonfirmasi. Buka kotak masuk emailmu, klik tautan konfirmasi, lalu masuk lagi.",
  ],
  [
    /already registered|already been registered|already exists/i,
    "Email ini sudah terdaftar. Coba masuk, atau pakai email lain.",
  ],
  [
    /password should be at least|password is too short/i,
    "Kata sandi terlalu pendek.",
  ],
  [
    /weak|pwned|easy to guess/i,
    "Kata sandi terlalu mudah ditebak. Pakai kombinasi huruf dan angka yang lebih unik.",
  ],
  [
    /rate limit|too many requests|security purposes/i,
    "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.",
  ],
  [
    /signups? (are )?(not allowed|disabled)|signup is disabled/i,
    "Pendaftaran email sedang dimatikan di server.",
  ],
  [
    /unable to validate email|invalid format|email address .* is invalid/i,
    "Format email tidak valid.",
  ],
  [
    /failed to fetch|network|load failed/i,
    "Tidak bisa terhubung ke server. Periksa koneksi internetmu.",
  ],
];
export function authMessage(err) {
  const raw = (err && (err.message || String(err))) || "";
  for (const [re, text] of MESSAGES) if (re.test(raw)) return text;
  return raw ? `Gagal: ${raw}` : "Terjadi kesalahan. Coba lagi.";
}

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

    // getSession menunggu proses "tukar kode login" selesai kalau pengguna baru kembali dari Google / tautan email
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
        const back = popReturn();
        if (back) navigateRef.current(back, { replace: true });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Masuk dengan Google (pindah ke halaman Google, lalu kembali ke situs ini)
  const signIn = useCallback(async () => {
    setAuthError("");
    rememberReturn();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setAuthError(authMessage(error));
  }, []);

  // Masuk dengan email + kata sandi. Mengembalikan { error } (teks, kosong kalau berhasil); sesi baru dipasang lewat onAuthStateChange.
  const signInEmail = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? authMessage(error) : "" };
  }, []);

  // Daftar dengan email. needsConfirm = true kalau Supabase meminta konfirmasi lewat email dulu (pengaturan "Confirm email").
  const signUpEmail = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/masuk`,
      },
    });
    if (error) return { error: authMessage(error), needsConfirm: false };
    // Dengan "Confirm email" aktif, email yang sudah terdaftar tidak memunculkan error; Supabase mengembalikan user tanpa identities.
    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        error: "Email ini sudah terdaftar. Coba masuk, atau pakai email lain.",
        needsConfirm: false,
      };
    }
    return { error: "", needsConfirm: !data.session };
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
      signInEmail,
      signUpEmail,
      signOut,
    }),
    [
      user,
      loading,
      authError,
      clearError,
      signIn,
      signInEmail,
      signUpEmail,
      signOut,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
