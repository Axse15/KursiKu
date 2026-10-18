import { TONES } from "./ui";

// Kepala halaman berupa petak berwarna dengan bingkai tebal (gaya bento): judul, keterangan, dan ruang untuk tombol/pilihan.
export default function PageHead({
  id,
  title,
  sub = null,
  tone = "yellow",
  children = null,
  className = "",
}) {
  return (
    <header className={`nb-card ${TONES[tone]} p-5 sm:p-7 ${className}`}>
      <h1
        id={id}
        className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl"
      >
        {title}
      </h1>
      {sub && (
        <p className="mt-2 max-w-2xl text-sm text-ink-2 sm:text-base">{sub}</p>
      )}
      {children}
    </header>
  );
}
