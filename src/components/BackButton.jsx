import { useLocation, useNavigate } from "react-router-dom";

// Halaman utama di menu: tidak perlu tombol kembali.
const TOP = [
  "/",
  "/bioskop",
  "/sedang-tayang",
  "/segera-hadir",
  "/terlaris",
  "/riwayat",
  "/profil",
];

// Halaman tujuan kalau tidak ada riwayat di dalam aplikasi (mis. halaman dibuka langsung dari tautan atau setelah login).
function parentOf(pathname) {
  if (pathname.startsWith("/tiket")) return "/riwayat";
  return "/";
}

// Tombol kembali untuk semua halaman selain beranda. Halaman bayar punya tombol Kembali sendiri di bawah.
export default function BackButton() {
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  if (TOP.includes(pathname) || pathname.startsWith("/checkout")) return null;

  function back() {
    // key "default" = halaman pertama yang dibuka di tab ini, jadi tidak ada halaman aplikasi di belakangnya.
    // Tiket selalu ke riwayat: kalau memakai riwayat browser, tiket yang baru dibeli akan kembali ke denah kursi.
    if (key !== "default" && !pathname.startsWith("/tiket")) navigate(-1);
    else navigate(parentOf(pathname));
  }

  return (
    <button
      type="button"
      onClick={back}
      className="nb-lift mb-5 inline-flex min-h-12 items-center gap-3 rounded-full border-2 border-edge bg-panel py-1.5 pl-1.5 pr-5 text-base font-bold text-ink shadow-nb hover:bg-raised sm:mb-6"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-edge bg-tile-yellow"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5" />
          <path d="M11 5l-7 7 7 7" />
        </svg>
      </span>
      Kembali
    </button>
  );
}
