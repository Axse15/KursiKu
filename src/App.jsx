import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { isConfigured } from "./lib/supabase";
import { Empty, btnPrimary } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthButton from "./components/AuthButton";
import ThemeToggle from "./components/ThemeToggle";
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
import Nearby from "./pages/Nearby";

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
  ["/promo", "Promo"],
  ["/terdekat", "Terdekat"],
  ["/riwayat", "Riwayat"],
];

function Layout({ children }) {
  const width = useLocation().pathname === "/" ? "max-w-6xl" : "max-w-3xl";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sm:sticky sm:top-0 z-30 border-b border-line bg-page/85 backdrop-blur print:hidden">
        <div
          className={`mx-auto flex ${width} flex-wrap items-center justify-between gap-x-4 px-4 py-1 sm:py-3`}
        >
          <Link
            to="/"
            className="flex min-h-11 items-center font-display text-2xl font-bold tracking-tight text-accent-ink"
          >
            KursiKu
          </Link>
          <nav
            aria-label="Menu utama"
            className="order-last flex w-full items-center gap-1 sm:order-none sm:w-auto sm:gap-2"
          >
            {NAV.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex min-h-11 items-center rounded-lg px-3 text-sm hover:text-accent-ink ${isActive ? "font-semibold text-accent-ink" : "text-ink-2"}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="{mx-auto w-full ${width} flex-1 px-4 py-6 sm:py-8}">
        <BackButton />
        {children}
      </main>
      <footer className="border-t border-line px-4 py-4 text-center text-xs text-faint print:hidden">
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
          className="rounded-xl border border-warn-line bg-warn-bg p-4 text-sm"
        >
          <p className="font-semibold text-accent-ink">
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
                <Route path="/terdekat" element={<Nearby />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </Layout>
        </CinemaProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
