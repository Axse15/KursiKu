import { TONES } from "./ui";

// Bingkai halaman masuk/daftar: kiri petak berisi alasan punya akun (hanya di layar lebar), kanan formulir.
const PERKS = [
  [
    "Tiket tersimpan",
    "Semua pesananmu ada di satu akun, bisa dibuka dari HP atau laptop.",
  ],
  [
    "Poin tiap kursi",
    "Dapat 10 poin per kursi. Kalau sudah banyak, poin bisa ditukar jadi potongan harga.",
  ],
  [
    "Kode promo",
    "Kode promo harian hanya bisa dipakai oleh akun yang sudah masuk.",
  ],
];

export default function AuthShell({ title, sub, children }) {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside
        className={`nb-card hidden flex-col justify-between gap-6 p-7 md:flex ${TONES.yellow}`}
      >
        <div>
          <p className="font-display text-3xl font-extrabold leading-tight tracking-tight">
            Satu akun untuk semua tiketmu
          </p>
          <ul className="mt-6 space-y-4">
            {PERKS.map(([head, body]) => (
              <li key={head}>
                <p className="font-bold">{head}</p>
                <p className="text-sm text-ink-2">{body}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-2">
          Bioskop fiktif untuk tugas kuliah. Tidak ada uang sungguhan yang
          diproses.
        </p>
      </aside>

      <section className="nb-card p-5 sm:p-8">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {title}
        </h1>
        {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
