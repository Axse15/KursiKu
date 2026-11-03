import { TONES } from './ui'

// Kepala halaman berupa petak berwarna dengan bingkai tebal (gaya bento): judul, keterangan, dan ruang untuk tombol/pilihan.
// Di HP dibuat ringkas (judul lebih kecil, jarak lebih rapat) supaya daftar film langsung terlihat tanpa menggulir jauh.
export default function PageHead({ id, title, sub = null, tone = 'yellow', children = null, className = '' }) {
  return (
    <header className={`nb-card ${TONES[tone]} p-4 sm:p-6 lg:p-7 ${className}`}>
      <h1 id={id} className="font-display text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      {sub && <p className="mt-1.5 max-w-2xl text-sm text-ink-2 sm:mt-2 sm:text-base">{sub}</p>}
      {children}
    </header>
  )
}
