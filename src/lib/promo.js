// Aturan promo. Semua fungsi murni (tanpa jaringan) supaya mudah diuji.
// Ini simulasi: potongan dihitung di aplikasi, tidak ada uang sungguhan.

const DAYS_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
const DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// 0 = Minggu ... 6 = Sabtu, menurut waktu Jakarta
export function weekdayWib(date) {
  const d = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return DOW[d];
}

const todayWib = (now) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);

export const normalizeCode = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

// Syarat promo dalam kalimat pendek, untuk kartu promo.
export function promoTerms(p) {
  const t = [];
  if (p.weekdays?.length)
    t.push(`Berlaku hari ${p.weekdays.map((d) => DAYS_ID[d]).join(", ")}`);
  if (p.min_seats > 1) t.push(`Minimal ${p.min_seats} kursi`);
  if (p.max_discount)
    t.push(`Potongan maksimal Rp${p.max_discount.toLocaleString("id-ID")}`);
  if (p.valid_until) t.push(`Sampai ${p.valid_until}`);
  return t;
}

/**
 * Hitung potongan.
 * @returns {{ok: true, discount: number, total: number} | {ok: false, reason: string}}
 */
export function applyPromo(
  promo,
  { subtotal, seatCount, startsAt, now = new Date() },
) {
  if (!promo || !promo.active)
    return { ok: false, reason: "Kode promo tidak ditemukan." };
  if (promo.valid_until && todayWib(now) > promo.valid_until)
    return { ok: false, reason: "Promo ini sudah berakhir." };
  if (seatCount < promo.min_seats)
    return {
      ok: false,
      reason: `Promo ini butuh minimal ${promo.min_seats} kursi.`,
    };
  if (
    promo.weekdays?.length &&
    !promo.weekdays.includes(weekdayWib(new Date(startsAt)))
  ) {
    return {
      ok: false,
      reason: `Promo ini hanya untuk jadwal hari ${promo.weekdays.map((d) => DAYS_ID[d]).join(", ")}.`,
    };
  }
  const discount = discountOf(promo, subtotal);
  return { ok: true, discount, total: subtotal - discount };
}

// Besar potongan untuk subtotal tertentu, tanpa memeriksa syarat (dipakai untuk tiket yang sudah dibeli,
// yang syaratnya sudah terpenuhi saat itu).
export function discountOf(promo, subtotal) {
  if (!promo) return 0;
  let d = Math.floor((subtotal * promo.percent_off) / 100);
  if (promo.max_discount) d = Math.min(d, promo.max_discount);
  return Math.max(0, Math.min(d, subtotal));
}
