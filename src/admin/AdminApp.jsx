import { useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { displayName, rememberReturn, useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { forgetAdmin, useIsAdmin } from "../lib/admin";
import { Avatar } from "../components/AuthButton";
import ThemeToggle from "../components/ThemeToggle";
import { Empty, Icon, Skeleton, btnGhost, btnPrimary, useDialog } from "./kit";
import Overview from "./Overview";
import Orders from "./Orders";
import CheckIn from "./CheckIn";
import Analysis from "./Analysis";
import Promos from "./Promos";
import Films from "./Films";
import Showtimes from "./Showtimes";
import AdminCinemas from "./AdminCinemas";
import Users from "./Users";
import Log from "./Log";

// Menu di sidebar (layar lebar), dikelompokkan.
const GROUPS = [
  {
    label: "Operasional",
    items: [
      { to: "/admin", label: "Ringkasan", icon: "grid", end: true },
      { to: "/admin/pesanan", label: "Pesanan", icon: "receipt" },
      { to: "/admin/validasi", label: "Validasi tiket", icon: "scan" },
      { to: "/admin/analisis", label: "Analisis film", icon: "chart" },
    ],
  },
  {
    label: "Katalog",
    items: [
      { to: "/admin/film", label: "Film", icon: "film" },
      { to: "/admin/jadwal", label: "Jadwal", icon: "calendar" },
      { to: "/admin/bioskop", label: "Bioskop", icon: "pin" },
      { to: "/admin/promo", label: "Promo", icon: "tag" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { to: "/admin/pengguna", label: "Pengguna", icon: "users" },
      { to: "/admin/log", label: "Log", icon: "log" },
    ],
  },
];

// Bar bawah di HP, sama seperti situs pembeli: empat menu yang paling sering dipakai + "Lainnya".
const TABS = [
  { to: "/admin", label: "Ringkasan", icon: "grid", end: true },
  { to: "/admin/pesanan", label: "Pesanan", icon: "receipt" },
  { to: "/admin/validasi", label: "Validasi", icon: "scan" },
  { to: "/admin/film", label: "Film", icon: "film" },
];
// menu yang tidak muat di bar bawah, tampil di panel "Lainnya"
const MORE = [
  { to: "/admin/analisis", label: "Analisis", icon: "chart" },
  { to: "/admin/jadwal", label: "Jadwal", icon: "calendar" },
  { to: "/admin/bioskop", label: "Bioskop", icon: "pin" },
  { to: "/admin/promo", label: "Promo", icon: "tag" },
  { to: "/admin/pengguna", label: "Pengguna", icon: "users" },
  { to: "/admin/log", label: "Log", icon: "log" },
];

// tanda kursi bioskop yang sama dengan header situs pembeli
function Logo() {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-edge bg-accent text-on-accent shadow-[2px_2px_0_0_var(--color-edge)]"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <rect x="5" y="2" width="14" height="11" rx="3" />
        <rect x="1.5" y="9" width="5" height="10" rx="2" />
        <rect x="17.5" y="9" width="5" height="10" rx="2" />
        <rect x="5" y="14" width="14" height="6" rx="2" />
      </svg>
    </span>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo />
      <div className="leading-tight">
        <p className="font-display text-lg font-extrabold tracking-tight">
          KursiKu
        </p>
        <p className="text-xs font-bold text-muted">Panel admin</p>
      </div>
    </div>
  );
}

// Akun yang sedang masuk, ganti tema, lihat situs, dan keluar. Dipakai di sidebar dan di panel "Lainnya".
function AccountBlock({ onNavigate }) {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const name = profile?.full_name || displayName(user);

  async function leave() {
    forgetAdmin();
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 rounded-xl bg-raised/60 p-2">
        <Avatar user={user} size={36} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/sedang-tayang"
          onClick={onNavigate}
          className={`${btnGhost} min-h-10 gap-1.5 whitespace-nowrap px-2 text-xs`}
        >
          <Icon name="external" className="size-4" />
          Lihat situs
        </Link>
        <button
          type="button"
          onClick={leave}
          className={`${btnGhost} min-h-10 gap-1.5 whitespace-nowrap px-2 text-xs`}
        >
          <Icon name="logout" className="size-4" />
          Keluar
        </button>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-4">
        <Brand />
      </div>

      <nav aria-label="Menu admin" className="flex-1 overflow-y-auto px-3 pb-3">
        {GROUPS.map((g) => (
          <div key={g.label} className="mt-4">
            <p className="px-3 pb-1.5 text-xs font-bold text-muted">
              {g.label}
            </p>
            <ul className="space-y-1">
              {g.items.map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    end={t.end}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 text-sm font-bold transition-colors ${
                        isActive
                          ? "border-edge bg-tile-yellow text-ink shadow-[2px_2px_0_0_var(--color-edge)]"
                          : "border-transparent text-ink-2 hover:bg-raised hover:text-ink"
                      }`
                    }
                  >
                    <Icon name={t.icon} className="size-[18px]" />
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t-2 border-line px-3 py-3">
        <AccountBlock />
      </div>
    </div>
  );
}

// Panel dari bawah untuk menu yang tidak muat di bar bawah. Dialog bawaan browser: fokus terkunci dan Escape menutupnya.
function MoreSheet({ onClose }) {
  const ref = useDialog(onClose);
  return (
    <dialog
      ref={ref}
      aria-label="Menu lainnya"
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-2 border-b-0 border-edge bg-panel p-0 text-ink backdrop:bg-black/60 lg:hidden"
    >
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            Menu lainnya
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="grid size-10 place-items-center rounded-xl border-2 border-line-strong bg-panel hover:border-edge hover:bg-raised"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {MORE.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-xl border-2 px-3 text-sm font-bold ${
                    isActive
                      ? "border-edge bg-tile-yellow text-ink shadow-[2px_2px_0_0_var(--color-edge)]"
                      : "border-line-strong bg-panel text-ink-2"
                  }`
                }
              >
                <Icon name={t.icon} className="size-[18px]" />
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t-2 border-line pt-4">
          <AccountBlock onNavigate={onClose} />
        </div>
      </div>
    </dialog>
  );
}

// Bar bawah di HP: ikon dalam kotak kecil, yang aktif berwarna kuning (sama dengan bar bawah situs pembeli).
function BottomBar({ onMore, moreOpen }) {
  const { pathname } = useLocation();
  const inMore = MORE.some(
    (t) => pathname === t.to || pathname.startsWith(`${t.to}/`),
  );
  const pill = (on) =>
    `grid h-8 w-12 place-items-center rounded-xl border-2 transition-colors ${on ? "border-edge bg-tile-yellow text-ink shadow-[2px_2px_0_0_var(--color-edge)]" : "border-transparent"}`;
  const cell =
    "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-bold leading-none text-ink-2";
  return (
    <nav
      aria-label="Menu admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-edge bg-page pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 py-1.5">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink to={t.to} end={t.end} className={cell}>
              {({ isActive }) => (
                <>
                  <span className={pill(isActive)}>
                    <Icon name={t.icon} className="size-[22px]" />
                  </span>
                  <span className={isActive ? "text-ink" : ""}>{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onMore}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={cell}
          >
            <span className={pill(inMore || moreOpen)}>
              <Icon name="menu" className="size-[22px]" />
            </span>
            <span className={inMore || moreOpen ? "text-ink" : ""}>
              Lainnya
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

function Gate({ children }) {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}

// Penjaga halaman: tamu diajak masuk, akun biasa ditolak. Pemeriksaan sebenarnya ada di database (setiap fungsi admin_* memeriksa peran).
export default function AdminApp() {
  const { user, loading } = useAuth();
  const { admin, checking } = useIsAdmin();
  const [more, setMore] = useState(false);

  if (loading || checking) {
    return (
      <Gate>
        <Skeleton className="h-64" />
      </Gate>
    );
  }

  if (!user) {
    return (
      <Gate>
        <Empty title="Masuk dulu untuk membuka panel admin" icon="users">
          <p>Panel ini khusus admin KursiKu.</p>
          <Link
            to="/masuk"
            onClick={rememberReturn}
            className={`${btnPrimary} mt-4`}
          >
            Masuk
          </Link>
        </Empty>
      </Gate>
    );
  }

  if (!admin) {
    return (
      <Gate>
        <Empty title="Halaman ini khusus admin" icon="users">
          <p>
            Akun yang sedang masuk bukan admin. Kalau kamu seharusnya punya
            akses, minta pemilik proyek menambahkan akunmu lewat database (lihat
            PANDUAN-ADMIN.md).
          </p>
          <Link to="/" className={`${btnPrimary} mt-4`}>
            Kembali ke beranda
          </Link>
        </Empty>
      </Gate>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        href="#konten-admin"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:border-2 focus:border-edge focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:font-bold"
      >
        Lewati ke konten
      </a>

      <aside className="hidden lg:block">
        <div className="sticky top-0 h-screen border-r-2 border-line-strong bg-panel">
          <Sidebar />
        </div>
      </aside>

      <div className="min-w-0">
        {/* HP: header sederhana seperti situs pembeli, menunya ada di bar bawah */}
        <header className="flex items-center justify-between gap-3 border-b-2 border-edge bg-page/95 px-4 py-2.5 print:hidden lg:hidden">
          <Brand />
          <ThemeToggle />
        </header>

        <main
          id="konten-admin"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 outline-none sm:px-6 sm:pt-8 lg:px-8 lg:pb-8"
        >
          <Routes>
            <Route index element={<Overview />} />
            <Route path="pesanan" element={<Orders />} />
            <Route path="validasi" element={<CheckIn />} />
            <Route path="analisis" element={<Analysis />} />
            <Route path="promo" element={<Promos />} />
            <Route path="film" element={<Films />} />
            <Route path="jadwal" element={<Showtimes />} />
            <Route path="bioskop" element={<AdminCinemas />} />
            <Route path="pengguna" element={<Users />} />
            <Route path="log" element={<Log />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      <BottomBar onMore={() => setMore(true)} moreOpen={more} />
      {more && <MoreSheet onClose={() => setMore(false)} />}
    </div>
  );
}
