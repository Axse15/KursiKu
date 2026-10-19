import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { isConfigured } from "./lib/supabase";
import { Empty, btnPrimary } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthButton from "./components/AuthButton";
import ThemeToggle from "./components/ThemeToggle";
import HeaderSearch from "./components/HeaderSearch";
import BackButton from "./components/BackButton";
import { AuthProvider } from "./lib/auth";
import { ProfileProvider } from "./lib/profile";
import { CinemaProvider } from "./lib/cinema";
import Home from "./pages/Home";
import Movie from "./pages/Movie";
import Seats from "./pages/Seats";
import Checkout from "./pages/Checkout";
import Ticket from "./pages/Ticket";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Promo from "./pages/Promo";
import NowShowing from "./pages/NowShowing";
import ComingSoon from "./pages/ComingSoon";
import Cinemas from "./pages/Cinemas";
import SearchPage from "./pages/SearchPage";

// Atribusi wajib dari TMDB. Taruh logo resmi TMDB di public/tmdb-logo.svg (kalau belum ada, logo disembunyikan).
function TmdbCredit() {
  const [noLogo, setNoLogo] = useState(false);
  return (
    <p className="mt-2 flex flex-wrap items-center justify-center gap-2">
      {!noLogo && (
        <img
          src="/tmdb-logo.svg"
          alt="TMDB"
          className="h-3"
          onError={() => setNoLogo(true)}
        />
      )}
      <span>
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </span>
    </p>
  );
}

const NAV = [
  ["/", "Home"],
  ["/bioskop", "Bioskop"],
  ["/sedang-tayang", "Sedang tayang"],
  ["/segera-hadir", "Coming soon"],
  ["/promo", "Promo"],
  ["/riwayat", "Riwayat"],
  ["/profil", "Profil"],
];

// halaman daftar dibuat lebih lebar (tata letak bento); halaman lain (kursi, bayar, tiket) tetap sempit agar nyaman dibaca
const WIDE = ["/", "/bioskop", "/sedang-tayang", "/segera-hadir", "/cari"];

function Layout({ children }) {
  const { pathname } = useLocation();
  const width = WIDE.includes(pathname) ? "max-w-6xl" : "max-w-5xl";
  const navRef = useRef(null);

  // HP: tujuh menu tidak muat satu baris, jadi menu digulir supaya item yang aktif terlihat
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const left =
      active.getBoundingClientRect().left -
      nav.getBoundingClientRect().left +
      nav.scrollLeft;
    nav.scrollTo({ left: left - (nav.clientWidth - active.clientWidth) / 2 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="z-30 border-b-2 border-edge bg-page/95 backdrop-blur-md lg:sticky lg:top-0 print:hidden">
        <div className={`mx-auto ${width} px-4 py-2`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap">
            <Link
              to="/"
              className="flex min-h-11 items-center gap-2.5 font-display text-xl font-extrabold tracking-tight text-ink"
            >
              {/* tanda kursi bioskop: sandaran, dua sandaran tangan, dudukan */}
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-xl border-2 border-edge bg-accent text-on-accent shadow-nb"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                  <rect x="5" y="2" width="14" height="11" rx="3" />
                  <rect x="1.5" y="9" width="5" height="10" rx="2" />
                  <rect x="17.5" y="9" width="5" height="10" rx="2" />
                  <rect x="5" y="14" width="14" height="6" rx="2" />
                </svg>
              </span>
              KursiKu
            </Link>

            {/* HP tegak: pencarian turun ke baris sendiri; tablet ke atas: di tengah header */}
            <HeaderSearch className="order-last w-full md:order-none md:max-w-md md:flex-1" />

            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>

          <nav
            ref={navRef}
            aria-label="Menu utama"
            className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1"
          >
            {NAV.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"} // Home hanya aktif di beranda, bukan di semua halaman
                className={({ isActive }) =>
                  `flex min-h-10 shrink-0 items-center rounded-xl border-2 px-3.5 text-sm font-bold transition-colors ${
                    isActive
                      ? "border-edge bg-tile-yellow text-ink shadow-nb"
                      : "border-transparent text-ink-2 hover:border-edge hover:bg-raised"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-4 py-6 sm:py-8`}>
        <BackButton />
        {children}
      </main>

      <footer className="border-t-2 border-edge px-4 py-8 text-center text-xs text-muted print:hidden">
        <p>
          Bioskop fiktif untuk tugas kuliah. Jadwal, harga, dan pemesanan hanya
          simulasi.
        </p>
        <p className="mt-1">
          Data film: TMDB, OMDb (rating IMDb), dan Trakt (jumlah penonton),
          semuanya opsional di sisi pengembang.
        </p>
        <TmdbCredit />
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <Empty title="Halaman tidak ditemukan">
      <Link to="/" className={`${btnPrimary} mt-2`}>
        Kembali ke beranda
      </Link>
    </Empty>
  );
}

export default function App() {
  const location = useLocation();

  if (!isConfigured) {
    return (
      <Layout>
        <div
          role="alert"
          className="rounded-2xl border-2 border-warn-line bg-warn-bg p-4 text-sm"
        >
          <p className="font-semibold text-warn">
            Konfigurasi Supabase belum diisi
          </p>
          <p className="mt-2 text-ink-2">
            Isi <code>VITE_SUPABASE_URL</code> dan{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code>{" "}
            (lokal) atau di Environment Variables Vercel, lalu build ulang.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <AuthProvider>
      <ProfileProvider>
        <CinemaProvider>
          <Layout>
            {/* key = alamat halaman, supaya error di satu halaman hilang saat pindah halaman */}
            <ErrorBoundary key={location.pathname}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/film/:id" element={<Movie />} />
                <Route path="/pilih-kursi/:showtimeId" element={<Seats />} />
                <Route path="/checkout/:showtimeId" element={<Checkout />} />
                <Route path="/tiket/:code" element={<Ticket />} />
                <Route path="/riwayat" element={<History />} />
                <Route path="/profil" element={<Profile />} />
                <Route path="/promo" element={<Promo />} />
                <Route path="/bioskop" element={<Cinemas />} />
                <Route path="/sedang-tayang" element={<NowShowing />} />
                <Route path="/segera-hadir" element={<ComingSoon />} />
                <Route path="/cari" element={<SearchPage />} />
                <Route
                  path="/terdekat"
                  element={<Navigate to="/bioskop" replace />}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Layout>
        </CinemaProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
