import {
  ROWS,
  COLS,
  AISLE_AFTER,
  PREMIUM_ROWS,
  IDEAL_ROW_INDEX,
} from "./config";

export const VALID_SEAT = /^[A-H]([1-9]|10)$/;

export const seatCode = (row, col) => `${row}${col}`;
export const isPremium = (code) => PREMIUM_ROWS.includes(code[0]);
export const seatPrice = (code, showtime) =>
  isPremium(code) ? showtime.price_premium : showtime.price_regular;

export const sortSeats = (seats) =>
  [...seats].sort(
    (a, b) =>
      a[0].localeCompare(b[0]) || Number(a.slice(1)) - Number(b.slice(1)),
  );

// Pecah kolom menjadi seksi yang dipisah lorong: [[1,2], [3..8], [9,10]]
function sections() {
  const bounds = [0, ...AISLE_AFTER, COLS];
  return bounds
    .slice(0, -1)
    .map((start, i) =>
      Array.from({ length: bounds[i + 1] - start }, (_, k) => start + k + 1),
    );
}

/**
 * Cari `count` kursi berdampingan (tidak terpisah lorong) yang kosong,
 * dengan skor terendah = paling dekat tengah baris + paling dekat baris ideal.
 * Mengembalikan array kode kursi, atau null jika tidak ada.
 */
export function findBestSeats(count, taken) {
  const centerCol = (COLS + 1) / 2;
  let best = null;

  ROWS.forEach((row, rowIdx) => {
    for (const cols of sections()) {
      for (let i = 0; i + count <= cols.length; i++) {
        const block = cols.slice(i, i + count);
        if (block.some((c) => taken.has(seatCode(row, c)))) continue;

        const blockCenter = (block[0] + block[block.length - 1]) / 2;
        const score =
          Math.abs(blockCenter - centerCol) +
          1.5 * Math.abs(rowIdx - IDEAL_ROW_INDEX);

        if (!best || score < best.score) {
          best = { score, seats: block.map((c) => seatCode(row, c)) };
        }
      }
    }
  });

  return best ? best.seats : null;
}
