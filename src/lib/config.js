// Semua konstanta ada di sini supaya mudah diubah.
export const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
export const COLS = 10;
export const AISLE_AFTER = [2, 8]; // lorong setelah kolom 2 dan kolom 8
export const PREMIUM_ROWS = ["F", "G", "H"];
export const MAX_SEATS = 6;
export const IDEAL_ROW_INDEX = 4; // baris E: posisi favorit penonton

export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export const fmtDate = (iso) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));

export const fmtTime = (iso) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  })
    .format(new Date(iso))
    .replace(".", ":");
// "Hari ini · 19:45", "Besok · 13:00", atau "Sab, 17 Okt · 16:30"
const ymd = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);

export function fmtWhen(iso) {
  const d = new Date(iso);
  const day = ymd(d);
  let label;
  if (day === ymd(new Date())) label = "Hari ini";
  else if (day === ymd(new Date(Date.now() + 86400000))) label = "Besok";
  else
    label = new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
  return `${label} · ${fmtTime(iso)}`;
}
