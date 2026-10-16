// Status rilis film, dihitung dari kolom release_date (tanggal saja, memakai tanggal Jakarta).
//   soon = belum rilis (Segera hadir)   new = rilis dalam NEW_DAYS hari terakhir (Baru rilis)   now = sudah lama tayang
// Murni (tanpa jaringan) supaya mudah diuji.
export const NEW_DAYS = 14;
const DAY = 864e5;

export const todayWib = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);

const dayMs = (s) => {
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
};

export function releaseInfo(movie, now = new Date()) {
  const date =
    typeof movie?.release_date === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(movie.release_date)
      ? movie.release_date.slice(0, 10)
      : null;
  const rel = date ? dayMs(date) : null;
  if (rel == null) return { status: "now", date: null, days: 0 }; // tanggal tidak diketahui: anggap sudah tayang
  const diff = Math.round((rel - dayMs(todayWib(now))) / DAY); // > 0: belum rilis
  if (diff > 0) return { status: "soon", date, days: diff };
  if (diff >= -NEW_DAYS) return { status: "new", date, days: -diff };
  return { status: "now", date, days: -diff };
}

const fmt = (date, opts) =>
  new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
export const fmtReleaseShort = (date) =>
  fmt(date, { day: "numeric", month: "short" }); // "23 Okt"
export const fmtReleaseLong = (date) =>
  fmt(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export const untilLabel = (days) =>
  days === 1 ? "Besok" : `${days} hari lagi`;
