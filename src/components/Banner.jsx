import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDayChip, fmtWhen } from "../lib/config";
import { fmtReleaseShort, untilLabel } from "../lib/release";
import { ratingOf, watchersOf } from "../lib/rank";
import { Backdrop, Poster, Texture, btnPrimary } from "./ui";

const SLIDE_MS = 6000;

// Tiap kategori punya warna, kalimat alasan, dan tombolnya sendiri, supaya slide-nya tidak terlihat seragam.
// (Nama kelas Tailwind ditulis utuh di sini; kalau dirakit dari potongan string, Tailwind tidak mengenalinya.)
const META = {
  promo: {
    label: "Lagi promo",
    chip: "bg-amber-300 text-black",
    ink: "text-amber-300",
    tint: "from-amber-500/30",
    hint: "Diskon film harian: berganti setiap hari dan hanya berlaku untuk film itu.",
  },
  rating: {
    label: "Rating bagus",
    chip: "bg-emerald-300 text-black",
    ink: "text-emerald-300",
    tint: "from-emerald-500/25",
    hint: "Nilai IMDb kalau ada, kalau tidak nilai TMDB. Film dengan suara terlalu sedikit tidak dihitung.",
  },
  populer: {
    label: "Paling populer",
    chip: "bg-rose-300 text-black",
    ink: "text-rose-300",
    tint: "from-rose-500/25",
    hint: "Berdasarkan skor popularitas TMDB, bukan jumlah tiket KursiKu (ini simulasi).",
  },
  baru: {
    label: "Baru rilis",
    chip: "bg-sky-300 text-black",
    ink: "text-sky-300",
    tint: "from-sky-500/25",
    hint: "Film yang rilis dalam 14 hari terakhir.",
  },
  segera: {
    label: "Segera hadir",
    chip: "bg-violet-300 text-black",
    ink: "text-violet-300",
    tint: "from-violet-500/30",
    hint: "Belum bisa dipesan. Jadwal dibuka saat film rilis.",
  },
};

// "hari ini" / "besok" / nama hari penuh (Minggu), menurut waktu Jakarta
function dayWord(iso) {
  const top = fmtDayChip(iso).top;
  if (top === "Hari ini") return "hari ini";
  if (top === "Besok") return "besok";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

// 1000 -> "1 rb", 81289 -> "81 rb", 1250000 -> "1,3 jt"
const compact = (n) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(1).replace(".", ",")} jt`
    : n >= 1e3
      ? `${Math.round(n / 1e3)} rb`
      : String(n);

// Angka besar + keterangan khas tiap kategori (inilah yang membedakan tampilan tiap slide)
function statOf(s) {
  const m = s.movie;
  if (s.kind === "promo")
    return {
      big: `−${s.deal.pct}%`,
      cap: `khusus ${dayWord(s.deal.at)}, hanya untuk film ini`,
    };
  if (s.kind === "rating") {
    const r = ratingOf(m);
    const votes = m.imdb_rating ? m.imdb_votes : m.vote_count;
    return {
      big: `★ ${r != null ? r.toFixed(1) : "-"}`,
      cap: `nilai ${m.imdb_rating ? "IMDb" : "TMDB"}${votes ? `, dari ${compact(Number(votes))} suara` : ""}`,
    };
  }
  if (s.kind === "populer") {
    const w = watchersOf(m);
    if (s.byWatchers && w)
      return {
        big: compact(w),
        cap: "penonton Trakt minggu ini (seluruh dunia)",
      };
    return { big: `#${s.rank || 1}`, cap: "terpopuler saat ini (skor TMDB)" };
  }
  if (s.kind === "baru")
    return {
      big: "Baru",
      cap:
        s.info.days === 0 ? "rilis hari ini" : `rilis ${s.info.days} hari lalu`,
    };
  return {
    big: untilLabel(s.info.days),
    cap: `rilis ${fmtReleaseShort(s.info.date)}`,
  };
}

// Banner beranda: satu slide per kategori, geser otomatis tiap 6 detik. Pilihan filmnya berganti tiap hari (lihat lib/featured.js).
// Berhenti sendiri kalau: kursor di atas banner, fokus keyboard di dalamnya, tab browser tersembunyi, atau pengguna menekan Jeda.
// Pengguna yang meminta "kurangi animasi" di perangkatnya mulai dalam keadaan jeda (bisa dinyalakan dengan tombol Putar).
function Slide({ s, index, total, active, next }) {
  const meta = META[s.kind];
  const movie = s.movie;
  const soon = s.kind === "segera";
  const flip = index % 2 === 1; // slide genap: poster pindah ke kiri
  const stat = statOf(s);
  const imdb = movie.imdb_rating ? Number(movie.imdb_rating).toFixed(1) : null;
  const tmdb = movie.vote_average
    ? Number(movie.vote_average).toFixed(1)
    : null;

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} dari ${total}: ${meta.label}, ${movie.title}`}
      data-active={active}
      data-kind={s.kind}
      className="hero-slide relative col-start-1 row-start-1 flex min-h-[28rem] items-center px-5 pb-20 pt-16 sm:min-h-[30rem] sm:px-10 sm:pb-24 sm:pt-10"
      style={{
        background: `linear-gradient(120deg, ${movie.poster_from}, ${movie.poster_to})`,
      }}
    >
      <Texture />
      <Backdrop src={movie.backdrop_url} />
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${flip ? "bg-gradient-to-l" : "bg-gradient-to-r"} from-black/85 via-black/60 to-black/20`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br ${meta.tint} to-transparent`}
      />
      <div
        className={`relative flex w-full items-center justify-between gap-10 ${flip ? "md:flex-row-reverse" : ""}`}
      >
        <div className="max-w-xl">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${meta.chip}`}
          >
            {meta.label}
          </span>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-0">
            <span
              className={`font-display text-4xl font-bold leading-none tracking-tight sm:text-6xl ${meta.ink}`}
            >
              {stat.big}
            </span>
            <span className="text-sm font-medium text-white/90">
              {stat.cap}
            </span>
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl">
            {movie.title}
          </h2>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
            <span>
              {movie.genre} · {movie.duration_min} menit
            </span>
            {tmdb && (
              <span className="rounded border border-white/40 px-1.5 text-xs font-semibold">
                ★ {tmdb} TMDB
              </span>
            )}
            {imdb && (
              <span className="rounded border border-white/40 px-1.5 text-xs font-semibold">
                IMDb {imdb}
              </span>
            )}
          </p>
          <p className="mt-3 line-clamp-2 text-white/90 sm:line-clamp-3">
            {movie.synopsis}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to={`/film/${movie.id}`} className={btnPrimary}>
              {soon
                ? "Lihat detail"
                : s.kind === "promo"
                  ? "Pesan dengan diskon"
                  : "Lihat jadwal"}
            </Link>
            {!soon && next[movie.id] && (
              <span className="text-sm text-white/85">
                Tayang berikutnya: {fmtWhen(next[movie.id])}
              </span>
            )}
          </div>
        </div>
        <div
          className={`relative hidden w-44 shrink-0 md:block ${flip ? "-rotate-3" : "rotate-3"}`}
        >
          <Poster
            movie={movie}
            showMeta={false}
            className="aspect-[2/3] w-full shadow-2xl shadow-black/50"
          />
        </div>
      </div>
    </div>
  );
}

export default function Banner({ slides, next }) {
  const [pick, setPick] = useState(0);
  const [paused, setPaused] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const [startX, setStartX] = useState(null);

  const list = slides;
  const active = Math.min(pick, list.length - 1);
  const playing = !paused && !hover && !focused && !hidden && list.length > 1;

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setTimeout(() => setPick((active + 1) % list.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [playing, active, list.length]);

  if (list.length === 0) return null;

  const go = (d) => setPick((active + d + list.length) % list.length);

  return (
    <section
      aria-label="Film pilihan hari ini"
      aria-roledescription="carousel"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={(e) => e.target.matches?.(":focus-visible") && setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div
        id="banner-panel"
        aria-live={playing ? "off" : "polite"}
        className="relative overflow-hidden rounded-3xl bg-zinc-950"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => setStartX(e.clientX)}
        onPointerUp={(e) => {
          if (startX != null && Math.abs(e.clientX - startX) > 50)
            go(e.clientX < startX ? 1 : -1);
          setStartX(null);
        }}
        onPointerCancel={() => setStartX(null)}
      >
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "Putar otomatis" : "Jeda geser otomatis"}
            className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-xs text-white backdrop-blur hover:bg-black/75"
          >
            <span aria-hidden="true">{paused ? "▶" : "❚❚"}</span>
          </button>
        )}
        <div className="grid">
          {list.map((s, i) => (
            <Slide
              key={s.kind}
              s={s}
              index={i}
              total={list.length}
              active={i === active}
              next={next}
            />
          ))}
        </div>

        {list.length > 1 && (
          <ul
            className="absolute inset-x-0 bottom-0 grid grid-flow-col auto-cols-fr gap-3 px-5 pb-4 sm:px-10 sm:pb-5"
            aria-label="Kategori pilihan"
          >
            {list.map((s, i) => (
              <li key={s.kind}>
                <button
                  type="button"
                  aria-pressed={i === active}
                  aria-label={`Tampilkan ${META[s.kind].label}: ${s.movie.title}`}
                  onClick={() => setPick(i)}
                  className="group block w-full py-3 text-left"
                >
                  <span className="block h-1 overflow-hidden rounded-full bg-white/30">
                    <span
                      key={`${active}-${playing}`}
                      className="block h-full origin-left rounded-full bg-white"
                      style={
                        i === active && playing
                          ? {
                              animation: `hero-fill ${SLIDE_MS}ms linear forwards`,
                            }
                          : {
                              transform:
                                i === active ? "scaleX(1)" : "scaleX(0)",
                            }
                      }
                    />
                  </span>
                  <span
                    className={`mt-2 hidden line-clamp-1 text-xs sm:block ${i === active ? "font-semibold text-white" : "text-white/75 group-hover:text-white"}`}
                  >
                    {META[s.kind].label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-2 text-xs text-faint">
        {list[active].kind === "populer" && list[active].byWatchers
          ? "Jumlah pengguna Trakt yang menonton film ini minggu ini (seluruh dunia), bukan jumlah tiket KursiKu (ini simulasi)."
          : META[list[active].kind].hint}
      </p>
    </section>
  );
}
