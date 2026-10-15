import { useCinema } from "../lib/cinema";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm ${
        active
          ? "border-amber-400 bg-amber-400 font-semibold text-zinc-950"
          : "border-zinc-700 text-zinc-300 hover:border-amber-400"
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
      <div
        role="group"
        aria-label="Pilih bioskop"
        className="flex flex-wrap gap-2"
      >
        <Chip active={!selected} onClick={() => select(null)}>
          Semua bioskop
        </Chip>
        {cinemas.map((c) => (
          <Chip
            key={c.id}
            active={selected?.id === c.id}
            onClick={() => select(c.id)}
          >
            {c.name.replace(/^KursiKu\s+/, "")} · {c.city}
          </Chip>
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-xs text-zinc-500">
          {selected.name} · {selected.address}
        </p>
      )}
    </div>
  );
}
