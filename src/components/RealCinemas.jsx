import { useEffect, useMemo, useRef, useState } from "react";
import {
  BRAND_SITES,
  CITIES,
  RADII_KM,
  directionsUrl,
  fetchNearby,
  fmtKm,
} from "../lib/nearby";
import CinemaTags from "./CinemaTags";
import { Chip, Empty, ErrorBox, Skeleton, btnPrimary, fieldCls } from "./ui";

const GEO_ERRORS = {
  1: "Izin lokasi ditolak. Pilih kota di bawah, atau izinkan lokasi di pengaturan browser.",
  2: "Lokasi tidak bisa ditentukan. Pilih kota di bawah.",
  3: "Menentukan lokasi terlalu lama. Pilih kota di bawah.",
};

// Penanda proses: server peta publik bisa lambat, jadi pengguna diberi tahu bahwa ini normal dan sudah berapa lama.
function SearchNote() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-sm text-muted">
      <span role="status">Mencari bioskop…</span>{" "}
      <span aria-hidden="true">{sec} dtk.</span> Server peta gratis kadang butuh
      10–20 detik
      {sec >= 8 ? ", mohon tunggu sebentar." : "."}
    </p>
  );
}

// Bioskop SUNGGUHAN (XXI, CGV, Cinépolis, dll.) dari OpenStreetMap. Hanya info lokasi, rute, dan tautan ke situs resminya.
// Tiketnya tidak bisa dibeli di KursiKu: tidak ada API publik resmi untuk jadwal dan pembayaran mereka.
export default function RealCinemas({ initialCity = "" }) {
  const startCity =
    CITIES.find((c) => c.name.toLowerCase() === initialCity.toLowerCase()) ||
    null;
  const [radius, setRadius] = useState(5);
  const [origin, setOrigin] = useState(
    startCity
      ? {
          lat: startCity.lat,
          lon: startCity.lon,
          label: `pusat kota ${startCity.name}`,
        }
      : null,
  );
  const [state, setState] = useState({
    status: "idle",
    items: [],
    error: "",
    fromCache: false,
  });
  const [geoMsg, setGeoMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const [brand, setBrand] = useState("Semua");
  const run = useRef(0); // nomor permintaan terbaru; jawaban yang terlambat dari permintaan lama diabaikan
  const abortRef = useRef(null);

  // kota dari pencarian header (?kota=) berganti saat halaman masih terbuka
  useEffect(() => {
    const c = CITIES.find(
      (x) => x.name.toLowerCase() === initialCity.toLowerCase(),
    );
    if (c) setOrigin({ lat: c.lat, lon: c.lon, label: `pusat kota ${c.name}` });
  }, [initialCity]);

  useEffect(() => {
    if (!origin) return undefined;
    const id = ++run.current;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState((s) => ({ ...s, status: "loading", error: "" }));
    setBrand("Semua");
    fetchNearby(origin.lat, origin.lon, radius, { signal: ctrl.signal })
      .then(({ items, fromCache }) => {
        if (id === run.current)
          setState({ status: "done", items, error: "", fromCache });
      })
      .catch((e) => {
        if (e.name === "AbortError" || id !== run.current) return;
        setState({
          status: "error",
          items: [],
          error: e.message,
          fromCache: false,
        });
      });
    return () => ctrl.abort();
  }, [origin, radius]);

  function useMyLocation() {
    setGeoMsg("");
    if (!("geolocation" in navigator)) {
      setGeoMsg("Browser ini tidak mendukung lokasi. Pilih kota di bawah.");
      return;
    }
    setLocating(true);
    // Kalau pertanyaan izin dibiarkan tanpa dijawab, browser tidak pernah memanggil balik. Beri batas waktu sendiri.
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      setLocating(false);
      setGeoMsg(GEO_ERRORS[3]);
    }, 15000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setLocating(false);
        setOrigin({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: "lokasimu sekarang",
        });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setLocating(false);
        setGeoMsg(GEO_ERRORS[err.code] || GEO_ERRORS[2]);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  function pickCity(e) {
    const c = CITIES.find((x) => x.name === e.target.value);
    setGeoMsg("");
    if (c) setOrigin({ lat: c.lat, lon: c.lon, label: `pusat kota ${c.name}` });
  }

  // merek yang ada di hasil, untuk tombol saring
  const brands = useMemo(() => {
    const count = {};
    for (const b of state.items)
      count[b.brand || "Lainnya"] = (count[b.brand || "Lainnya"] || 0) + 1;
    return Object.entries(count).sort(
      (a, b) => (a[0] === "Lainnya") - (b[0] === "Lainnya") || b[1] - a[1],
    );
  }, [state.items]);
  const activeBrand =
    brand === "Semua" || brands.some(([k]) => k === brand) ? brand : "Semua";
  const shown = state.items.filter(
    (b) => activeBrand === "Semua" || (b.brand || "Lainnya") === activeBrand,
  );

  const field = `mt-1 ${fieldCls}`;
  const cityValue =
    origin && CITIES.some((c) => origin.label === `pusat kota ${c.name}`)
      ? origin.label.replace("pusat kota ", "")
      : "";

  return (
    <div className="space-y-5">
      {/* pintu ke situs resmi: tiket XXI dan CGV hanya bisa dibeli di sana */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          [
            "XXI",
            "bg-tile-yellow",
            "Jadwal dan tiket XXI, The Premiere, dan IMAX.",
          ],
          [
            "CGV",
            "bg-tile-pink",
            "Jadwal dan tiket CGV, termasuk 4DX, ScreenX, dan Sweetbox.",
          ],
        ].map(([name, tone, text]) => (
          <a
            key={name}
            href={BRAND_SITES[name]}
            target="_blank"
            rel="noopener noreferrer"
            className={`nb-card nb-lift flex items-center justify-between gap-4 p-4 ${tone}`}
          >
            <span>
              <span className="block font-display text-xl font-extrabold leading-tight">
                Beli tiket {name} di situs resminya
              </span>
              <span className="mt-1 block text-sm text-ink-2">{text}</span>
            </span>
            <span aria-hidden="true" className="text-2xl font-bold">
              ↗
            </span>
          </a>
        ))}
      </div>
      <p className="text-xs text-muted">
        KursiKu bukan mitra XXI atau CGV dan tidak menjual tiket mereka. Tautan
        di atas membuka situs resmi mereka di tab baru.
      </p>

      <div className="nb-flat grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className={btnPrimary}
        >
          {locating ? "Mencari lokasi…" : "📍 Pakai lokasiku"}
        </button>
        <div>
          <label htmlFor="kota" className="text-xs font-bold text-muted">
            atau pilih kota
          </label>
          <select
            id="kota"
            value={cityValue}
            onChange={pickCity}
            className={field}
          >
            <option value="" disabled>
              Pilih kota…
            </option>
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="radius" className="text-xs font-bold text-muted">
            Radius
          </label>
          <select
            id="radius"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className={field}
          >
            {RADII_KM.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </div>
      </div>

      {geoMsg && (
        <p
          role="alert"
          className="rounded-xl border-2 border-warn-line bg-warn-bg p-3 text-sm"
        >
          {geoMsg}
        </p>
      )}

      {state.status === "idle" && (
        <Empty title="Belum ada pencarian">
          Izinkan lokasi atau pilih kota untuk melihat bioskop di sekitar.
        </Empty>
      )}

      {state.status === "loading" && (
        <div aria-busy="true" className="space-y-3">
          <SearchNote />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {state.status === "error" && (
        <ErrorBox
          message={state.error}
          onRetry={() => setOrigin({ ...origin })}
        />
      )}

      {state.status === "done" && origin && (
        <section aria-live="polite">
          <p className="text-sm text-ink-2">
            {state.items.length} bioskop dalam {radius} km dari {origin.label}
          </p>

          {brands.length > 1 && (
            <div
              role="group"
              aria-label="Saring menurut jaringan bioskop"
              className="mt-3 flex flex-wrap gap-2"
            >
              {[["Semua", state.items.length], ...brands].map(([k, n]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={activeBrand === k}
                  onClick={() => setBrand(k)}
                  className={`min-h-10 rounded-xl border-2 border-edge px-3 text-sm font-bold ${
                    activeBrand === k
                      ? "bg-ink text-page"
                      : "bg-panel text-ink hover:bg-raised"
                  }`}
                >
                  {k} <span className="tnum text-xs opacity-80">{n}</span>
                </button>
              ))}
            </div>
          )}

          {state.items.length === 0 ? (
            <div className="mt-3">
              <Empty title="Tidak ada bioskop yang tercatat">
                Data peta di daerah ini mungkin belum lengkap. Coba radius lebih
                besar atau kota lain.
              </Empty>
            </div>
          ) : (
            <ol className="mt-4 grid gap-4 md:grid-cols-2">
              {shown.map((b) => (
                <li key={b.id} className="nb-card flex flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-extrabold leading-tight tracking-tight">
                        {b.name}
                      </p>
                      <CinemaTags
                        brand={b.brand}
                        formats={b.formats}
                        className="mt-2"
                      />
                      {!b.brand && b.formats.length === 0 && (
                        <Chip tone="plain" className="mt-2">
                          Bioskop independen
                        </Chip>
                      )}
                    </div>
                    <p className="tnum shrink-0 font-display text-2xl font-extrabold leading-none text-accent-ink">
                      {fmtKm(b.km)}
                    </p>
                  </div>
                  {b.address && (
                    <p className="mt-2 text-sm text-muted">{b.address}</p>
                  )}
                  {b.hours && (
                    <p className="mt-1 text-xs text-muted">
                      Jam buka (data peta): {b.hours}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-x-4 pt-2 text-sm font-bold">
                    <a
                      href={directionsUrl(b)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center text-accent-ink underline"
                    >
                      Rute di Google Maps
                    </a>
                    {(b.website || BRAND_SITES[b.brand]) && (
                      <a
                        href={b.website || BRAND_SITES[b.brand]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-accent-ink underline"
                      >
                        Situs bioskop
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <div className="space-y-1 text-xs text-muted">
        <p>
          Data lokasi: ©{" "}
          <a
            className="underline"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            kontributor OpenStreetMap
          </a>
          , lewat Overpass API. Bisa kurang lengkap atau tidak terbaru. Penanda
          jaringan (XXI, CGV, ...) dan format (IMAX, 4DX, ...) hanya muncul
          kalau tertulis di data peta.
        </p>
        <p>
          Koordinatmu dikirim ke server peta hanya untuk pencarian ini dan tidak
          disimpan KursiKu. Bioskop di bagian ini tidak terhubung ke pemesanan:
          tiket di KursiKu hanya untuk cabang KursiKu (fiktif).
        </p>
      </div>
    </div>
  );
}
