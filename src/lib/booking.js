const KEY = "kursiku_booking_codes";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa huruf/angka yang mirip (I, O, 0, 1)

export function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "KSK-" + [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function getCodes() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function saveCode(code) {
  try {
    const codes = getCodes();
    if (!codes.includes(code)) {
      localStorage.setItem(KEY, JSON.stringify([code, ...codes]));
    }
  } catch {
    /* localStorage bisa diblokir; riwayat saja yang hilang, tiket tetap aman di database */
  }
}
