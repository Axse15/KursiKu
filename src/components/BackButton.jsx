import { useLocation, useNavigate } from "react-router-dom";

function parentOf(pathname) {
  if (pathname.startsWith("/tiket")) return "/riwayat";
  return "/";
}

export default function BackButton() {
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  if (pathname === "/" || pathname.startsWith("/checkout")) return null;

  function back() {
    if (key !== "default" && !pathname.startsWith("/tiket")) navigate(-1);
    else navigate(parentOf(pathname));
  }

  return (
    <button
      type="button"
      onClick={back}
      className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-ink-2 hover:text-accent-ink"
    >
      <span aria-hidden="true">←</span> Kembali
    </button>
  );
}
