import { Suspense, lazy, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { isConfigured } from "./lib/supabase";
import { Empty, Skeleton, btnPrimary } from "./components/ui";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthButton from "./components/AuthButton";
import ThemeToggle from "./components/ThemeToggle";
import HeaderSearch from "./components/HeaderSearch";
import BackButton from "./components/BackButton";
import BuyerOnly from "./components/BuyerOnly";
import { AuthProvider } from "./lib/auth";
import { ProfileProvider } from "./lib/profile";
import { CinemaProvider } from "./lib/cinema";
import HomeGate from "./components/HomeGate";
import ScanNotifier from "./components/ScanNotifier";
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
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terlaris from "./pages/Terlaris";

// Panel admin dimuat hanya saat dibuka, supaya pembeli biasa tidak ikut mengunduh kodenya.
const AdminApp = lazy(() => import("./admin/AdminApp"));

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

// Menu utama: 5 pintu saja. Riwayat & Profil ada di menu akun (kanan atas), Coming soon ada di dalam halaman Film.
// related = halaman lain yang tetap dianggap "bagian dari" menu ini (hanya untuk warna, bukan untuk aria-current).
const NAV = [
  { to: "/", label: "Home", icon: "home", end: true },
  {
    to: "/sedang-tayang",
    label: "Film",
    icon: "film",
    also: ["/segera-hadir"],
    related: "/film/",
  },
  { to: "/bioskop", label: "Bioskop", icon: "pin" },
  { to: "/promo", label: "Promo", icon: "tag" },
  { to: "/terlaris", label: "Terlaris", icon: "star", desktopOnly: true },
  { to: "/riwayat", label: "Tiket", icon: "ticket", mobileOnly: true },
];

function Icon({ name }) {
  const p = {
    viewBox: "0 0 24 24",
    width: 22,
    height: 22,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...p}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v10h13V10" />
        </svg>
      );
    case "film":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M8 4v16M16 4v16M3 9h5M16 9h5M3 15h5M16 15h5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...p}>
          <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      );
    case "tag":
      return (
        <svg {...p}>
          <path d="M3 12.5V4h8.5L21 13.5 13.5 21 3 12.5z" />
          <circle cx="7.5" cy="8.5" r="1.3" />
        </svg>
      );
    case "star":
      return (
        <svg {...p}>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
          <path d="M14 6v12" strokeDasharray="2 3" />
        </svg>
      );
  }
}

// halaman lebar (daftar film dan detail film) vs sempit (kursi, bayar, tiket, profil)
const WIDE = [
  "/",
  "/bioskop",
  "/sedang-tayang",
  "/segera-hadir",
  "/cari",
  "/terlaris",
  "/promo",
];
// halaman alur pesan: menu bawah disembunyikan supaya tidak bertabrakan dengan tombol lanjut di bagian bawah
const FLOW = ["/pilih-kursi", "/checkout", "/tiket"];

function stateOf(item, pathname) {
  const exact = item.end
    ? pathname === item.to
    : pathname === item.to || pathname.startsWith(`${item.to}/`);
  const also = (item.also || []).some((p) => pathname === p);
  const related = !!item.related && pathname.startsWith(item.related);
  return { current: exact || also, on: exact || also || related };
}

function Layout({ children }) {
  const { pathname } = useLocation();
  // Panel admin punya kerangka sendiri (menu samping), jadi menu dan footer situs pembeli tidak ikut tampil.
  if (pathname.startsWith("/admin"))
    return <div className="min-h-screen">{children}</div>;
  const wide = WIDE.includes(pathname) || pathname.startsWith("/film/");
  const width = wide ? "max-w-6xl" : "max-w-5xl";
  const inFlow = FLOW.some((p) => pathname.startsWith(p));
  const desktopItems = NAV.filter((n) => !n.mobileOnly);
  const mobileItems = NAV.filter((n) => !n.desktopOnly);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="z-30 border-b-2 border-edge bg-page/95 backdrop-blur-md lg:sticky lg:top-0 print:hidden">
        <div className={`mx-auto ${width} px-4 py-2.5`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap lg:gap-x-5">
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

            {/* layar lebar: lima menu di header. HP dan tablet: menu pindah ke bar bawah. */}
            <nav aria-label="Menu utama" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {desktopItems.map((item) => {
                  const st = stateOf(item, pathname);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={st.current ? "page" : undefined}
                        className={`flex min-h-10 items-center rounded-xl border-2 px-3.5 text-sm font-bold transition-colors ${
                          st.on
                            ? "border-edge bg-tile-yellow text-ink shadow-nb"
                            : "border-transparent text-ink-2 hover:border-edge hover:bg-raised"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* HP tegak: pencarian turun ke baris sendiri; tablet ke atas: mengisi sisa lebar header */}
            <HeaderSearch className="order-last w-full md:order-none md:ml-auto md:max-w-sm md:flex-1" />

            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full ${width} flex-1 px-4 py-6 sm:py-8 ${inFlow ? "" : "pb-28 lg:pb-10"}`}
      >
        <BackButton />
        {children}
      </main>

      <footer
        className={`border-t-2 border-edge px-4 py-8 text-center text-xs text-muted print:hidden ${inFlow ? "" : "pb-28 lg:pb-8"}`}
      >
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

      {!inFlow && (
        <nav
          aria-label="Menu utama"
          className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-edge bg-page pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
        >
          <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-1.5">
            {mobileItems.map((item) => {
              const st = stateOf(item, pathname);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={st.current ? "page" : undefined}
                    className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold leading-none text-ink-2"
                  >
                    <span
                      className={`grid h-8 w-12 place-items-center rounded-xl border-2 transition-colors ${
                        st.on
                          ? "border-edge bg-tile-yellow text-ink shadow-nb"
                          : "border-transparent"
                      }`}
                    >
                      <Icon name={item.icon} />
                    </span>
                    <span className={st.on ? "text-ink" : ""}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
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
          <ScanNotifier />
          <Layout>
            {/* key = alamat halaman, supaya error di satu halaman hilang saat pindah halaman */}
            <ErrorBoundary key={location.pathname}>
              <Routes>
                <Route path="/" element={<HomeGate />} />
                <Route path="/film/:id" element={<Movie />} />
                <Route
                  path="/pilih-kursi/:showtimeId"
                  element={
                    <BuyerOnly>
                      <Seats />
                    </BuyerOnly>
                  }
                />
                <Route
                  path="/checkout/:showtimeId"
                  element={
                    <BuyerOnly>
                      <Checkout />
                    </BuyerOnly>
                  }
                />
                <Route path="/tiket/:code" element={<Ticket />} />
                <Route path="/riwayat" element={<History />} />
                <Route
                  path="/admin/*"
                  element={
                    <Suspense fallback={<Skeleton className="h-64" />}>
                      <AdminApp />
                    </Suspense>
                  }
                />
                <Route path="/profil" element={<Profile />} />
                <Route path="/promo" element={<Promo />} />
                <Route path="/terlaris" element={<Terlaris />} />
                <Route
                  path="/spk"
                  element={<Navigate to="/terlaris" replace />}
                />
                <Route path="/masuk" element={<Login />} />
                <Route path="/daftar" element={<Register />} />
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
