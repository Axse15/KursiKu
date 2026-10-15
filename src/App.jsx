import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { isConfigured } from "./lib/supabase";
import { Empty, btnPrimary } from "./components/ui";
import Home from "./pages/Home";
import Movie from "./pages/Movie";
import Seats from "./pages/Seats";
import Checkout from "./pages/Checkout";
import Ticket from "./pages/Ticket";
import History from "./pages/History";
import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

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
function Layout({ children }) {
  // beranda dibuat lebih lebar; halaman lain (kursi, bayar, tiket) tetap sempit agar nyaman dibaca
  const width = useLocation().pathname === "/" ? "max-w-6xl" : "max-w-3xl";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800 print:hidden">
        <div
          className={`mx-auto flex ${width} items-center justify-between px-4 py-4`}
        >
          <Link
            to="/"
            className="font-display text-2xl font-bold tracking-tight text-amber-400"
          >
            KursiKu
          </Link>
          <NavLink
            to="/riwayat"
            className="flex min-h-11 items-center px-2 text-sm text-zinc-300 hover:text-amber-400"
          >
            Riwayat pesanan
          </NavLink>
        </div>
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-4 py-6`}>
        {children}
      </main>

      <footer className="border-t border-zinc-800 px-4 py-4 text-center text-xs text-zinc-500 print:hidden">
        <p>
          Bioskop fiktif untuk tugas kuliah. Jadwal, harga, dan pemesanan hanya
          simulasi.
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
          className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-sm"
        >
          <p className="font-semibold text-amber-300">
            Konfigurasi Supabase belum diisi
          </p>
          <p className="mt-2 text-zinc-300">
            Isi <code>VITE_SUPABASE_URL</code> dan{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> di file <code>.env</code>{" "}
            (lokal) atau di Environment Variables Vercel, lalu build ulang.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ErrorBoundary key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/film/:id" element={<Movie />} />
          <Route path="/pilih-kursi/:showtimeId" element={<Seats />} />
          <Route path="/checkout/:showtimeId" element={<Checkout />} />
          <Route path="/tiket/:code" element={<Ticket />} />
          <Route path="/riwayat" element={<History />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  );
}
