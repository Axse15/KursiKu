import { useEffect, useRef, useState } from "react";
import {
  CITIES,
  RADII_KM,
  directionsUrl,
  fetchNearby,
  fmtKm,
} from "../lib/nearby";
import { Empty, ErrorBox, Skeleton, btnPrimary } from "../components/ui";

const GEO_ERRORS = {
  1: "Izin lokasi ditolak. Pilih kota di bawah, atau izinkan lokasi di pengaturan browser.",
  2: "Lokasi tidak bisa ditentukan. Pilih kota di bawah.",
  3: "Menentukan lokasi terlalu lama. Pilih kota di bawah.",
};

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
      10–20 detik{sec >= 8 ? ", mohon tunggu sebentar." : "."}
    </p>
  );
}

export default function Nearby() {
  const [radius, setRadius] = useState(5);
  const [origin, setOrigin] = useState(null);
  const [state, setState] = useState({
    status: "idle",
    items: [],
    error: "",
    fromCache: false,
  });
  const [geoMsg, setGeoMsg] = useState("");
  const [locating, setLocating] = useState(false);
  const run = useRef(0);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!origin) return undefined;
    const id = ++run.current;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState((s) => ({ ...s, status: "loading", error: "" }));
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

  const field =
    "mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-panel px-3";
  const cityValue =
    origin && CITIES.some((c) => origin.label === `pusat kota ${c.name}`)
      ? origin.label.replace("pusat kota ", "")
      : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Bioskop terdekat</h1>
        <p className="mt-1 text-muted">
          Cari bioskop sungguhan di sekitarmu (CGV, XXI, dan lainnya), lengkap
          dengan jarak dan rute.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className={btnPrimary}
        >
          {locating ? "Mencari lokasi…" : "📍 Pakai lokasiku"}
        </button>
        <div>
          <label htmlFor="kota" className="text-sm font-medium text-ink-2">
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
          <label htmlFor="radius" className="text-sm font-medium text-ink-2">
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
          className="rounded-xl border border-warn-line bg-warn-bg p-3 text-sm"
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
          <p className="text-sm text-muted">
            {state.items.length} bioskop dalam {radius} km dari {origin.label}
          </p>
          {state.items.length === 0 ? (
            <div className="mt-3">
              <Empty title="Tidak ada bioskop yang tercatat">
                Data peta di daerah ini mungkin belum lengkap. Coba radius lebih
                besar atau kota lain.
              </Empty>
            </div>
          ) : (
            <ol className="mt-3 space-y-3">
              {state.items.map((b) => (
                <li
                  key={b.id}
                  className="rounded-2xl border border-line bg-panel p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold">
                        {b.name}
                      </p>
                      {b.brand && (
                        <span className="mt-1 inline-block rounded border border-line-strong px-1.5 text-xs font-semibold">
                          {b.brand}
                        </span>
                      )}
                      {b.address && (
                        <p className="mt-1 text-sm text-muted">{b.address}</p>
                      )}
                      {b.hours && (
                        <p className="mt-1 text-xs text-faint">
                          Jam buka (data peta): {b.hours}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 font-display text-lg font-bold text-accent-ink">
                      {fmtKm(b.km)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <a
                      href={directionsUrl(b)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-ink underline"
                    >
                      Rute di Google Maps
                    </a>
                    {b.website && (
                      <a
                        href={b.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-ink underline"
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

      <div className="space-y-1 text-xs text-faint">
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
          , lewat Overpass API. Bisa kurang lengkap atau tidak terbaru.
        </p>
        <p>
          Koordinatmu dikirim ke server peta hanya untuk pencarian ini dan tidak
          disimpan KursiKu. Bioskop di halaman ini tidak terhubung ke pemesanan:
          tiket di KursiKu hanya untuk bioskop fiktif KursiKu.
        </p>
      </div>
    </div>
  );
}
