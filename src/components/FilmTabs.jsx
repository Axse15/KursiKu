import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCinema } from "../lib/cinema";
import { useCatalog } from "../lib/catalog";
import { searchAll } from "../lib/search";
import { releaseInfo } from "../lib/release";

const MAX_FILMS = 5;
const MAX_PLACES = 4;

// Kolom pencarian di header: cari film (judul, genre, sutradara, pemeran) dan lokasi (kota, cabang bioskop).
// Pola "combobox": panah atas/bawah memilih saran, Enter membuka, Escape menutup. Enter tanpa pilihan = halaman hasil lengkap.
export default function HeaderSearch({ className = "" }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { cinemas } = useCinema();
  const listId = useId();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false); // film baru dimuat setelah kolom dipakai pertama kali
  const [active, setActive] = useState(-1);
  const { movies, loading, error } = useCatalog(started);

  // di halaman hasil, kolom ikut berisi kata pencarian yang sedang dilihat
  useEffect(() => {
    if (pathname === "/cari")
      setValue(new URLSearchParams(search).get("q") || "");
  }, [pathname, search]);

  const q = value.trim();
  const res = useMemo(
    () => searchAll(q, movies, cinemas),
    [q, movies, cinemas],
  );

  // daftar saran yang bisa dipilih, urut seperti tampilannya
  const options = useMemo(() => {
    const out = [];
    for (const m of res.films.slice(0, MAX_FILMS)) {
      const st = releaseInfo(m).status;
      out.push({
        key: `f${m.id}`,
        group: "Film",
        label: m.title,
        hint: st === "soon" ? "Coming soon" : m.genre,
        to: `/film/${m.id}`,
      });
    }
    for (const city of res.cities.slice(0, MAX_PLACES)) {
      out.push({
        key: `k${city}`,
        group: "Lokasi",
        label: `Bioskop di ${city}`,
        hint: "Kota",
        to: `/bioskop?kota=${encodeURIComponent(city)}`,
      });
    }
    for (const c of res.cinemas.slice(0, MAX_PLACES)) {
      out.push({
        key: `c${c.id}`,
        group: "Lokasi",
        label: c.name,
        hint: c.city,
        to: `/bioskop?kota=${encodeURIComponent(c.city)}`,
      });
    }
    if (q)
      out.push({
        key: "all",
        group: "",
        label: `Lihat semua hasil untuk “${q}”`,
        hint: "",
        to: `/cari?q=${encodeURIComponent(q)}`,
      });
    return out;
  }, [res, q]);

  useEffect(() => setActive(-1), [q]);

  // klik di luar menutup saran
  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  function go(to) {
    setOpen(false);
    navigate(to);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) =>
        options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1,
      );
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && options[active]) go(options[active].to);
      else if (q) go(`/cari?q=${encodeURIComponent(q)}`);
    }
  }

  const showList = open && q.length > 0;
  let lastGroup = null;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q) go(`/cari?q=${encodeURIComponent(q)}`);
        }}
      >
        <label htmlFor="cari-header" className="sr-only">
          Cari film atau lokasi
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            id="cari-header"
            type="search"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              showList && active >= 0 ? `${listId}-${active}` : undefined
            }
            autoComplete="off"
            value={value}
            placeholder="Cari film atau lokasi…"
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setStarted(true);
            }}
            onFocus={() => {
              setStarted(true);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className="min-h-11 w-full rounded-xl border-2 border-edge bg-panel pl-9 pr-3 text-sm text-ink placeholder:text-faint focus-visible:shadow-nb"
          />
        </div>
      </form>

      {showList && (
        <div className="nb-card absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto p-2 sm:min-w-[22rem]">
          {loading && options.length <= 1 && (
            <p className="px-2 py-2 text-sm text-muted">Memuat daftar film…</p>
          )}
          {error && <p className="px-2 py-2 text-sm text-danger">{error}</p>}
          {!loading && !error && options.length <= 1 && (
            <p className="px-2 py-2 text-sm text-muted">
              Tidak ada film atau lokasi yang cocok.
            </p>
          )}
          <ul id={listId} role="listbox" aria-label="Saran pencarian">
            {options.map((o, i) => {
              const head = o.group !== lastGroup && o.group ? o.group : null;
              lastGroup = o.group;
              return (
                <li key={o.key} role="presentation">
                  {head && (
                    <p
                      role="presentation"
                      className="px-2 pb-1 pt-2 text-xs font-bold text-muted"
                    >
                      {head}
                    </p>
                  )}
                  <div
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => go(o.to)}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-2 text-sm ${
                      i === active
                        ? "bg-tile-yellow font-semibold"
                        : "hover:bg-raised"
                    } ${o.key === "all" ? "mt-1 border-t-2 border-line font-semibold text-accent-ink" : ""}`}
                  >
                    <span className="min-w-0 truncate">{o.label}</span>
                    {o.hint && (
                      <span className="shrink-0 text-xs text-muted">
                        {o.hint}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
