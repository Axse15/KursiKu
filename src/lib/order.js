import { discountOf } from "./promo";
import { seatPrice } from "./seats";
import { POINT_VALUE } from "./points";

// Rincian harga satu pesanan, urutannya:
//   base           = harga normal semua kursi
//   dealDiscount   = potongan diskon film harian (lihat deals.js)
//   subtotal       = base - dealDiscount
//   discount       = potongan kode promo (dihitung dari subtotal, bukan dari base)
//   pointsDiscount = potongan dari poin yang ditukar (1 poin = Rp100), paling banyak sisa tagihan
//   total          = subtotal - discount - pointsDiscount
export function orderTotals(
  seatCodes,
  showtime,
  promo = null,
  dealPercent = 0,
  pointsUsed = 0,
) {
  const base = seatCodes.reduce((sum, c) => sum + seatPrice(c, showtime), 0);
  const subtotal = seatCodes.reduce(
    (sum, c) => sum + seatPrice(c, showtime, dealPercent),
    0,
  );
  const discount = discountOf(promo, subtotal);
  const pointsDiscount = Math.min(
    Math.max(0, pointsUsed) * POINT_VALUE,
    subtotal - discount,
  );
  return {
    base,
    dealPercent,
    dealDiscount: base - subtotal,
    subtotal,
    discount,
    pointsUsed,
    pointsDiscount,
    total: subtotal - discount - pointsDiscount,
  };
}
