import { useEffect, useRef } from "react";

// Kunci video YouTube dari TMDB berupa 11 karakter huruf/angka/_/-. Selain itu ditolak.
export const isValidYoutubeKey = (k) =>
  typeof k === "string" && /^[A-Za-z0-9_-]{6,20}$/.test(k);

// Pemutar trailer di dalam halaman (tidak membuka tab YouTube).
// Videonya tetap dari YouTube (embed resmi, domain "nocookie"), tapi tampil di sini.
export default function TrailerModal({ videoKey, title, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // halaman di belakang tidak ikut ter-scroll
    closeRef.current?.focus();

    function onKey(e) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      // jaga fokus tetap di dalam dialog
      const items = [
        ...dialogRef.current.querySelectorAll("button, a[href], iframe"),
      ];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  const id = encodeURIComponent(videoKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // klik area gelap = tutup
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Trailer ${title}`}
        className="w-full max-w-3xl"
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="line-clamp-1 font-display text-lg font-semibold text-white">
            Trailer · {title}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-xl border border-zinc-600 px-4 text-sm text-white hover:border-amber-400"
          >
            Tutup ✕
          </button>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={`Trailer ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        </div>

        <p className="mt-2 text-xs text-zinc-400">
          Video tidak mau diputar? Pemilik video kadang melarang pemutaran di
          situs lain.{" "}
          <a
            href={`https://www.youtube.com/watch?v=${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-300 underline"
          >
            Buka di YouTube
          </a>
        </p>
      </div>
    </div>
  );
}
