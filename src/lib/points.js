// Aturan poin KursiKu. Angka di sini harus sama dengan yang di supabase-v10.sql
// (10 poin per kursi diberikan trigger database; batas 500 poin per pesanan dijaga constraint).
export const POINTS_PER_SEAT = 10; // didapat tiap kursi yang dibeli
export const POINT_VALUE = 100; // 1 poin = Rp100 potongan
export const MIN_REDEEM = 50; // minimal poin yang bisa ditukar sekaligus (= Rp5.000)
export const MAX_REDEEM = 500; // batas di database per pesanan (= Rp50.000)
export const MAX_SHARE = 0.5; // poin paling banyak menutup 50% dari total yang harus dibayar
export const STEP = 10; // kelipatan poin yang ditukar

export const pointsEarned = (seatCount) => seatCount * POINTS_PER_SEAT;
export const pointsToRupiah = (points) => points * POINT_VALUE;

// Poin terbanyak yang boleh dipakai di pesanan ini: tidak melebihi saldo, 50% dari total, dan batas database.
// 0 artinya belum bisa ditukar (saldo atau total terlalu kecil).
export function maxRedeem(balance, payable) {
  const byShare = Math.floor((payable * MAX_SHARE) / POINT_VALUE);
  const cap = Math.floor(Math.min(balance, byShare, MAX_REDEEM) / STEP) * STEP;
  return cap >= MIN_REDEEM ? cap : 0;
}
