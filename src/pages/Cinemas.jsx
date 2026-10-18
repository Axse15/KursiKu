import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCinema } from "../lib/cinema";
import { rupiah } from "../lib/config";
import { cinemaCoords, rankCinemas, useUserLocation } from "../lib/geo";
import { fmtKm } from "../lib/nearby";
import PageHead from "../components/PageHead";
import RealCinemas from "../components/RealCinemas";
import {
  Chip,
  Empty,
  ErrorBox,
  SectionTitle,
  Skeleton,
  Sticker,
  btnPrimary,
} from "../components/ui";

const STUDIO_FALLBACK = ["Reguler", "Premium"];

// Halaman "Pilihan bioskop": cabang KursiKu yang bisa dipesan, dan daftar bioskop sungguhan (XXI, CGV, ...) di sekitar.
export default function Cinemas() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { cinemas, selected, select, loading, error, reload } = useCinema();
  const geo = useUserLocation({ auto: false });
  const kota = params.get("kota") || "";

  const cities = useMemo(
    () => [...new Set(cinemas.map((c) => c.city))].sort(),
    [cinemas],
  );
  const activeCity = cities.includes(kota) ? kota : "";

  // urut dari yang terdekat kalau lokasi diketahui
  const kmOf = {};
  if (geo.status === "ok")
    for (const r of rankCinemas(cinemas, geo.lat, geo.lon))
      kmOf[String(r.cinema.id)] = r.km;
  const list = cinemas
    .filter((c) => !activeCity || c.city === activeCity)
    .sort(
      (a, b) =>
        (kmOf[String(a.id)] ?? 1e9) - (kmOf[String(b.id)] ?? 1e9) ||
        a.id - b.id,
    );
  const nearestId =
    list.length > 0 && kmOf[String(list[0].id)] != null
      ? String(list[0].id)
      : null;

  function setCity(name) {
    const next = new URLSearchParams(params);
    if (name) next.set("kota", name);
    else next.delete("kota");
    setParams(next, { replace: true });
  }

  function choose(c) {
    select(c.id);
    navigate("/sedang-tayang");
  }

  const chip = (label, active, onClick) => (
    <button
      key={label}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-xl border-2 border-edge px-3.5 text-sm font-bold ${active ? "bg-ink text-page" : "bg-panel text-ink hover:bg-raised"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-10">
      <PageHead
        id="bioskop-judul"
        title="Pilihan bioskop"
        tone="green"
        sub="Pilih cabang KursiKu untuk memesan tiket, atau cari XXI, CGV, dan bioskop lain di sekitarmu."
      >
        {cities.length > 1 && (
          <div
            role="group"
            aria-label="Saring cabang menurut kota"
            className="mt-5 flex flex-wrap gap-2"
          >
            {chip("Semua kota", !activeCity, () => setCity(""))}
            {cities.map((city) =>
              chip(city, activeCity === city, () => setCity(city)),
            )}
          </div>
        )}
      </PageHead>

      <section aria-labelledby="kursiku-judul">
        <SectionTitle
          id="kursiku-judul"
          sub="Cabang fiktif untuk tugas kuliah. Jadwal, kursi, dan pembayaran di sini hanya simulasi."
          aside={
            geo.status !== "ok" ? (
              <button
                type="button"
                onClick={geo.request}
                disabled={geo.status === "locating"}
                className="inline-flex min-h-11 items-center text-sm font-bold text-accent-ink underline"
              >
                {geo.status === "locating"
                  ? "Mencari lokasi…"
                  : "📍 Urutkan dari lokasiku"}
              </button>
            ) : null
          }
        >
          Cabang KursiKu
        </SectionTitle>

        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : loading && cinemas.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : list.length === 0 ? (
          <Empty title="Belum ada cabang di kota ini">
            <button
              type="button"
              onClick={() => setCity("")}
              className="font-bold text-accent-ink underline"
            >
              Lihat semua kota
            </button>
          </Empty>
        ) : (
          <>
            {selected && (
              <p className="mb-4 text-sm text-ink-2">
                Bioskop pilihanmu: <strong>{selected.name}</strong>.{" "}
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="inline-flex min-h-11 items-center font-bold text-accent-ink underline"
                >
                  Pakai semua bioskop
                </button>
              </p>
            )}
            <ul className="grid gap-5 md:grid-cols-2">
              {list.map((c, i) => {
                const isSel = selected?.id === c.id;
                const km = kmOf[String(c.id)];
                const studios =
                  Array.isArray(c.formats) && c.formats.length
                    ? c.formats
                    : STUDIO_FALLBACK;
                const tone = [
                  "bg-tile-yellow",
                  "bg-tile-blue",
                  "bg-tile-lilac",
                  "bg-tile-orange",
                ][i % 4];
                return (
                  <li
                    key={c.id}
                    className={`nb-card flex flex-col p-5 ${tone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-2xl font-extrabold leading-tight tracking-tight">
                          {c.name}
                        </h3>
                        <p className="mt-0.5 text-sm font-bold text-ink-2">
                          {c.city}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {String(c.id) === nearestId && (
                          <Sticker>Terdekat</Sticker>
                        )}
                        {isSel && <Chip tone="green">Dipilih</Chip>}
                        {km != null && cinemaCoords(c) && (
                          <span className="tnum text-xs font-bold text-ink-2">
                            {fmtKm(km)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-ink-2">{c.address}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-1.5">
                      <Chip tone="plain">KursiKu</Chip>
                      {studios.map((f) => (
                        <Chip key={f} tone="plain">
                          {f}
                        </Chip>
                      ))}
                    </p>
                    <p className="tnum mt-3 text-sm text-ink-2">
                      Reguler <strong>{rupiah(c.price_regular)}</strong> ·
                      Premium <strong>{rupiah(c.price_premium)}</strong>
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => choose(c)}
                        className={btnPrimary}
                      >
                        {isSel ? "Lihat film di sini" : "Pilih & lihat film"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="nyata-judul">
        <SectionTitle
          id="nyata-judul"
          sub="XXI, CGV, Cinépolis, dan lainnya di sekitarmu, lengkap dengan jarak, format layar, dan rute."
        >
          Bioskop sungguhan di sekitarmu
        </SectionTitle>
        <RealCinemas initialCity={kota} />
      </section>

      <p className="text-xs text-muted">
        Mau tahu film apa yang tayang? Lihat{" "}
        <Link to="/sedang-tayang" className="font-bold underline">
          Sedang tayang
        </Link>{" "}
        atau{" "}
        <Link to="/segera-hadir" className="font-bold underline">
          Coming soon
        </Link>
        .
      </p>
    </div>
  );
}
