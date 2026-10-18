import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const KEY = "kursiku_theme"; // 'light' | 'dark'; kosong = ikut pengaturan perangkat
const ThemeCtx = createContext({ theme: "dark", toggle() {} });
export const useTheme = () => useContext(ThemeCtx);

function systemTheme() {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

function initialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* penyimpanan diblokir: pakai pengaturan perangkat */
  }
  return systemTheme();
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  // pasang ke <html> (skrip kecil di index.html sudah melakukannya sebelum halaman tampil, supaya tidak berkedip)
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta)
      meta.setAttribute("content", theme === "light" ? "#f7f3ea" : "#13111f");
  }, [theme]);

  // sebelum pengguna memilih sendiri, tema mengikuti perangkat
  useEffect(() => {
    let mq;
    try {
      mq = window.matchMedia("(prefers-color-scheme: light)");
    } catch {
      return undefined;
    }
    const onChange = () => {
      try {
        if (localStorage.getItem(KEY)) return;
      } catch {
        /* abaikan */
      }
      setTheme(mq.matches ? "light" : "dark");
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* tetap berganti untuk sesi ini */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
