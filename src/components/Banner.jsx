import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDayChip, fmtWhen } from "../lib/config";
import { fmtReleaseShort, untilLabel } from "../lib/release";
import { ratingOf, watchersOf } from "../lib/rank";
import { Backdrop, Poster, Sticker, btnPrimary } from "./ui";

const SLIDE_MS = 6000;

// Tiap kategori punya label, kalimat alasan, dan angka besar sendiri, supaya slide-nya tidak terlihat seragam.
const META = {
  promo: {
    label: "Lagi promo",
    hint: "Diskon film harian: berganti setiap hari dan hanya berlaku untuk film itu.",
  },
  rating: {
    label: "Rating bagus",
    hint: "Nilai IMDb kalau ada, kalau tidak nilai TMDB. Film dengan suara terlalu sedikit tidak dihitung.",
  },
  populer: {
    label: "Paling populer",
    hint: "Berdasarkan skor popularitas TMDB, bukan jumlah tiket KursiKu (ini simulasi).",
  },
  baru: {
    label: "Baru rilis",
    hint: "Film yang rilis dalam 14 hari terakhir.",
  },
  segera: {
    label: "Segera hadir",
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
      className="hero-slide on-brand relative col-start-1 row-start-1 flex min-h-[28rem] items-center bg-brand px-5 pb-24 pt-16 text-on-brand sm:min-h-[30rem] sm:px-10 sm:pb-24 sm:pt-10"
    >
      {/* foto latar sangat redup, hanya memberi suasana; teks selalu di atas warna kobalt polos */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 mix-blend-luminosity"
      >
        <Backdrop src={movie.backdrop_url} />
      </div>
      {/* garis sobekan di sisi poster */}
      <div
        aria-hidden="true"
        className={`absolute inset-y-0 hidden w-0 border-l-4 border-dashed border-white/30 md:block ${flip ? "left-[16rem]" : "right-[16rem]"}`}
      />
      <div
        className={`relative flex w-full items-center justify-between gap-10 ${flip ? "md:flex-row-reverse" : ""}`}
      >
        <div className="max-w-xl">
          <Sticker>{meta.label}</Sticker>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-0">
            <span className="font-display text-6xl font-black leading-none tracking-tight text-accent sm:text-8xl">
              {stat.big}
            </span>
            <span className="text-sm font-semibold text-white">{stat.cap}</span>
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
            {movie.title}
          </h2>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white">
            <span>
              {movie.genre} · {movie.duration_min} menit
            </span>
            {tmdb && (
              <span className="rounded-sm border border-white/60 px-1.5 font-mono text-xs">
                ★ {tmdb} TMDB
              </span>
            )}
            {imdb && (
              <span className="rounded-sm border border-white/60 px-1.5 font-mono text-xs">
                IMDb {imdb}
              </span>
            )}
          </p>
          <p className="mt-3 line-clamp-2 text-white sm:line-clamp-3">
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
              <span className="font-mono text-sm text-white">
                Tayang berikutnya: {fmtWhen(next[movie.id])}
              </span>
            )}
          </div>
        </div>
        <div className="relative hidden w-48 shrink-0 md:block">
          <Poster
            movie={movie}
            showMeta={false}
            className="aspect-[2/3] w-full rounded-md border-4 border-white shadow-[6px_6px_0_var(--color-accent)]"
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
        className="relative overflow-hidden rounded-2xl border-4 border-edge bg-brand shadow-[8px_8px_0_var(--color-shadow)]"
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
            className="on-brand absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-md border-2 border-white/70 bg-brand text-xs text-white hover:bg-white hover:text-brand"
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
            className="on-brand absolute inset-x-0 bottom-0 grid grid-flow-col auto-cols-fr gap-3 border-t-2 border-white/30 bg-brand px-5 pb-3 sm:px-10 sm:pb-4"
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
                  <span className="block h-1.5 overflow-hidden bg-white/30">
                    <span
                      key={`${active}-${playing}`}
                      className="block h-full origin-left bg-accent"
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
                    className={`mt-2 hidden line-clamp-1 text-xs sm:block ${i === active ? "font-bold text-accent" : "text-white group-hover:text-accent"}`}
                  >
                    {META[s.kind].label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 font-mono text-xs text-faint">
        {list[active].kind === "populer" && list[active].byWatchers
          ? "Jumlah pengguna Trakt yang menonton film ini minggu ini (seluruh dunia), bukan jumlah tiket KursiKu (ini simulasi)."
          : META[list[active].kind].hint}
      </p>
    </section>
  );
}
