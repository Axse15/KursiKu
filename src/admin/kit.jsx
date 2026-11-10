import { cloneElement, useEffect, useId, useRef, useState } from "react";

// Bagian-bagian yang dipakai ulang di semua halaman panel admin.
//
// Gaya: tetap neobrutalism seperti situs pembeli, tapi dilembutkan. Tinta tebal (border-edge + bayangan keras) hanya dipakai
// untuk hal yang penting: tombol utama, menu yang aktif, dan jendela dialog. Kartu, tabel, dan kolom isian memakai garis
// yang lebih halus (line-strong) dengan bayangan tipis, supaya halaman padat tidak terasa ramai.

// ---------- permukaan ----------
export const card =
  "rounded-2xl border-2 border-line-strong bg-panel shadow-[3px_3px_0_0_var(--color-line)]";
export const cardFlat = "rounded-2xl border-2 border-line-strong bg-panel";

const TONE = {
  plain: "bg-raised",
  yellow: "bg-tile-yellow",
  green: "bg-tile-green",
  blue: "bg-tile-blue",
  pink: "bg-tile-pink",
  lilac: "bg-tile-lilac",
  orange: "bg-tile-orange",
  // arti status: hijau = beres, kuning = menunggu, merah muda = masalah atau nonaktif, biru = info
  ok: "bg-tile-green",
  warn: "bg-tile-yellow",
  bad: "bg-tile-pink",
  info: "bg-tile-blue",
};

// ---------- tombol ----------
const btnBase =
  "inline-flex items-center justify-center gap-2 font-bold transition-[transform,box-shadow,background-color,border-color] duration-150 disabled:pointer-events-none disabled:opacity-50";

export const btnPrimary = `${btnBase} min-h-11 rounded-xl border-2 border-edge bg-accent px-5 text-sm text-on-accent shadow-[2px_2px_0_0_var(--color-edge)] hover:-translate-x-px hover:-translate-y-px hover:bg-accent-hover hover:shadow-[3px_3px_0_0_var(--color-edge)] active:translate-x-px active:translate-y-px active:shadow-none disabled:shadow-none`;
export const btnGhost = `${btnBase} min-h-11 rounded-xl border-2 border-line-strong bg-panel px-5 text-sm text-ink hover:border-edge hover:bg-raised`;
export const btnSmall = `${btnBase} min-h-10 rounded-lg border-2 border-line-strong bg-panel px-3 text-xs text-ink hover:border-edge hover:bg-raised`;
export const btnDanger = `${btnBase} min-h-11 rounded-xl border-2 border-danger-line bg-danger-bg px-5 text-sm text-danger hover:bg-panel`;

// ---------- isian ----------
export const inputCls =
  "min-h-11 w-full rounded-xl border-2 border-line-strong bg-panel px-3 text-sm text-ink placeholder:text-faint hover:border-edge focus-visible:border-edge focus-visible:shadow-[2px_2px_0_0_var(--color-edge)]";
export const textareaCls =
  "w-full rounded-xl border-2 border-line-strong bg-panel p-3 text-sm text-ink placeholder:text-faint hover:border-edge focus-visible:border-edge focus-visible:shadow-[2px_2px_0_0_var(--color-edge)]";

// ---------- tabel ----------
export const th =
  "whitespace-nowrap border-b-2 border-line-strong bg-raised/70 px-3 py-2.5 text-left text-xs font-bold text-muted";
export const td = "border-b border-line px-3 py-3 align-top text-sm";

// ---------- ikon (garis 2px, 24x24) ----------
const PATHS = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="2" />
      <rect x="14" y="12" width="7" height="9" rx="2" />
      <rect x="3" y="16" width="7" height="5" rx="2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12.5V4h8.5L21 13.5 13.5 21 3 12.5z" />
      <circle cx="7.5" cy="8.5" r="1.3" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 4v16M16 4v16M3 9h5M16 9h5M3 15h5M16 15h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  log: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 13h7M9 17h7" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z" />
      <path d="M14 6v12" strokeDasharray="2 3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13l2.5-7h11L20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 13h4.5a3.5 3.5 0 0 0 7 0H20" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="5" y="11" width="3.5" height="9" rx="1" />
      <rect x="10.25" y="5" width="3.5" height="15" rx="1" />
      <rect x="15.5" y="9" width="3.5" height="11" rx="1" />
    </>
  ),
};

export function Icon({ name, className = "size-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {PATHS[name] || null}
    </svg>
  );
}

// ---------- kerangka halaman ----------
// Judul halaman (h1) + keterangan singkat + tombol aksi di kanan.
export function Page({ id, title, sub = null, actions = null, children }) {
  return (
    <section aria-labelledby={id}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 sm:mb-6">
        <div className="min-w-0">
          <h1
            id={id}
            className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
          >
            {title}
          </h1>
          {sub && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted sm:text-base">
              {sub}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </header>
      {children}
    </section>
  );
}

// Kartu berjudul (h2) untuk mengelompokkan isi sebuah halaman.
export function Card({
  title = null,
  sub = null,
  aside = null,
  children,
  className = "",
}) {
  return (
    <section className={`${card} p-4 sm:p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
            )}
            {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

// Baris pencarian dan saringan, dikelompokkan dalam satu kartu supaya tidak berserakan.
export function Toolbar({ children, className = "" }) {
  return (
    <div className={`${cardFlat} mb-4 space-y-3 p-3 sm:p-4 ${className}`}>
      {children}
    </div>
  );
}

// Kolom pencarian dengan ikon kaca pembesar. Label tetap ada untuk pembaca layar.
export function SearchBox({ id, label, value, onChange, placeholder }) {
  return (
    <div className="relative min-w-[14rem] flex-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-muted"
      >
        <Icon name="search" className="size-4" />
      </span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} pl-9`}
      />
    </div>
  );
}

// Saringan berbentuk pil: label kecil di kiri, pilihan di kanan.
export function FilterSelect({ id, label, value, onChange, children }) {
  return (
    <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 border-line-strong bg-panel pl-3 pr-1 hover:border-edge focus-within:border-edge">
      <label htmlFor={id} className="text-xs font-bold text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 max-w-[9.5rem] cursor-pointer rounded-lg bg-transparent py-1 pl-1 pr-2 text-sm font-bold text-ink"
      >
        {children}
      </select>
    </div>
  );
}

// Isian tanggal dengan label kecil di kiri, senada dengan FilterSelect.
export function DateField({ id, label, value, onChange, min, max }) {
  return (
    <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 border-line-strong bg-panel pl-3 pr-1 hover:border-edge focus-within:border-edge">
      <label htmlFor={id} className="text-xs font-bold text-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 bg-transparent px-1 text-sm font-bold text-ink"
      />
    </div>
  );
}

// ---------- status dan umpan balik ----------
// Kotak pesan hasil aksi: hijau kalau berhasil, merah kalau gagal.
export function Flash({ flash, onClose }) {
  if (!flash) return null;
  const ok = flash.kind === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`mb-4 flex items-start justify-between gap-3 rounded-xl border-2 p-3 text-sm ${ok ? "border-line-strong bg-ok-bg text-ok" : "border-danger-line bg-danger-bg text-danger"}`}
    >
      <p>{flash.text}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 font-bold underline"
        >
          Tutup
        </button>
      )}
    </div>
  );
}

export function Badge({ tone = "plain", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-line-strong px-2.5 py-0.5 text-xs font-bold leading-tight text-ink ${TONE[tone] || TONE.plain}`}
    >
      <span
        aria-hidden="true"
        className="size-1.5 rounded-full bg-current opacity-60"
      />
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl border-2 border-line bg-raised ${className}`}
    />
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-danger-line bg-danger-bg p-4 text-sm"
    >
      <p className="font-bold text-danger">Terjadi kesalahan</p>
      <p className="mt-1 text-ink-2">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${btnGhost} mt-3 min-h-10`}
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children, icon = "inbox" }) {
  return (
    <div className={`${cardFlat} border-dashed p-8 text-center sm:p-10`}>
      <span
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-2xl border-2 border-line-strong bg-raised text-muted"
      >
        <Icon name={icon} className="size-6" />
      </span>
      <p className="mt-3 font-display text-xl font-extrabold tracking-tight">
        {title}
      </p>
      <div className="mx-auto mt-1.5 max-w-md text-sm text-muted">
        {children}
      </div>
    </div>
  );
}

// Label + kolom isian yang terhubung (htmlFor/id otomatis). Anak harus satu elemen isian.
export function Field({ label, hint, children, className = "" }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": hint ? `${id}-hint` : undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

// ---------- dialog ----------
// Jendela dialog bawaan browser (<dialog>): fokus terkunci di dalamnya dan Escape menutupnya.
// Event "close" dikirim terlambat. Di mode dev (React.StrictMode) efek dijalankan, dibersihkan, lalu dijalankan lagi,
// jadi "close" dari pembersihan pertama tiba ketika dialog sudah terbuka kembali. Yang dianggap penutupan sungguhan
// hanya "close" yang datang saat dialog benar-benar sedang tertutup.
export function useDialog(onClose) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return undefined;
    const handle = () => {
      if (!d.open) onCloseRef.current();
    };
    d.addEventListener("close", handle);
    if (!d.open) d.showModal();
    return () => {
      d.removeEventListener("close", handle);
      if (d.open) d.close();
    };
  }, []);
  return ref;
}

export function Modal({ title, onClose, children, wide = false }) {
  const ref = useDialog(onClose);
  const titleId = useId();
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[92vh] w-[calc(100%-1.5rem)] ${wide ? "max-w-3xl" : "max-w-lg"} overflow-y-auto rounded-3xl border-2 border-edge bg-panel p-0 text-ink shadow-[5px_5px_0_0_var(--color-line-strong)] backdrop:bg-black/60`}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="font-display text-2xl font-extrabold leading-tight tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela"
            className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-line-strong bg-panel hover:border-edge hover:bg-raised"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

// Konfirmasi aksi. reasonLabel diisi = wajib mengisi alasan (minimal 3 huruf).
export function ConfirmModal({
  title,
  children,
  confirmLabel,
  danger = false,
  reasonLabel = null,
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  const needReason = reasonLabel && reason.trim().length < 3;
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={go} className="space-y-4">
        <div className="text-sm text-ink-2">{children}</div>
        {reasonLabel && (
          <Field label={reasonLabel}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={120}
              required
              className={textareaCls}
            />
          </Field>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border-2 border-danger-line bg-danger-bg p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Batal
          </button>
          <button
            type="submit"
            disabled={busy || needReason}
            className={danger ? btnDanger : btnPrimary}
          >
            {busy ? "Memproses…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------- data ----------
// Penomoran halaman: "Menampilkan 26-50 dari 130" + Sebelumnya / Berikutnya
export function Pager({ total, limit, offset, onChange }) {
  if (!total) return null;
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <nav
      aria-label="Halaman data"
      className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"
    >
      <p className="text-muted">
        Menampilkan {from}–{to} dari {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={btnSmall}
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          className={btnSmall}
          disabled={offset + limit >= total}
          onClick={() => onChange(offset + limit)}
        >
          Berikutnya
        </button>
      </div>
    </nav>
  );
}

// Petak angka ringkasan: angka besar, ikon kecil berwarna di pojok.
export function Stat({
  label,
  value,
  sub = null,
  icon = null,
  tone = "yellow",
  className = "",
}) {
  return (
    <div className={`${card} p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink-2">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={`grid size-9 shrink-0 place-items-center rounded-xl border-2 border-edge text-ink ${TONE[tone] || TONE.plain}`}
          >
            <Icon name={icon} className="size-[18px]" />
          </span>
        )}
      </div>
      <p className="mt-2 break-words font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

// Tabel yang bisa digulir ke samping di layar kecil (bisa difokus supaya terbaca lewat keyboard).
// Baris disorot saat disentuh dan garis bawah baris terakhir dihilangkan.
export function TableWrap({ label, children }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className={`${cardFlat} relative overflow-x-auto [&_tbody_tr:hover]:bg-raised/50 [&_tbody_tr:last-child_td]:border-b-0`}
    >
      {children}
    </div>
  );
}
