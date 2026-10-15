import { discountOf } from "./promo";
import { seatPrice } from "./seats";

// base = harga normal; dealDiscount = diskon film harian; subtotal = base - dealDiscount;
// discount = promo (dihitung dari subtotal); total = subtotal - discount
export function orderTotals(
  seatCodes,
  showtime,
  promo = null,
  dealPercent = 0,
) {
  const base = seatCodes.reduce((sum, c) => sum + seatPrice(c, showtime), 0);
  const subtotal = seatCodes.reduce(
    (sum, c) => sum + seatPrice(c, showtime, dealPercent),
    0,
  );
  const discount = discountOf(promo, subtotal);
  return {
    base,
    dealPercent,
    dealDiscount: base - subtotal,
    subtotal,
    discount,
    total: subtotal - discount,
  };
}
