import { useCinema } from "../lib/cinema";
import { fieldCls } from "./ui";

// Tab bioskop berbentuk pil. Yang dipilih terisi warna teks (hitam di tema terang, putih di tema gelap).
function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-xl border-2 border-edge px-4 text-sm font-bold transition-colors ${
        active ? "bg-ink text-page" : "bg-panel text-ink hover:bg-raised"
      }`}
    >
      {children}
    </button>
  );
}

// Pemilih bioskop. Pilihannya dibagi ke semua halaman lewat CinemaProvider.
export default function CinemaPicker({ className = "" }) {
  const { cinemas, selected, select } = useCinema();
  if (cinemas.length === 0) return null;

  return (
    <div className={className}>
      {/* HP: dropdown (hemat tempat). Layar lebar: deretan tab. */}
      <select
        aria-label="Pilih bioskop"
        value={selected ? String(selected.id) : ""}
        onChange={(e) => select(e.target.value ? e.target.value : null)}
        className={`${fieldCls} sm:hidden`}
      >
        <option value="">Semua bioskop</option>
        {cinemas.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name.replace(/^KursiKu\s+/, "")} · {c.city}
          </option>
        ))}
      </select>
      <div
        role="group"
        aria-label="Pilih bioskop"
        className="hidden flex-wrap gap-2 sm:flex"
      >
        <Tab active={!selected} onClick={() => select(null)}>
          Semua bioskop
        </Tab>
        {cinemas.map((c) => (
          <Tab
            key={c.id}
            active={selected?.id === c.id}
            onClick={() => select(c.id)}
          >
            {c.name.replace(/^KursiKu\s+/, "")} · {c.city}
          </Tab>
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-xs text-ink-2">
          {selected.name} · {selected.address}
        </p>
      )}
    </div>
  );
}
