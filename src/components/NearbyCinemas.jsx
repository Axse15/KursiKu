import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { directionsUrl, fetchNearby, fmtKm } from "../lib/nearby";

// Bioskop SUNGGUHAN di sekitar pengguna (CGV, XXI, dll.) dari OpenStreetMap lewat Overpass.
// Hanya info lokasi + rute. Jadwal dan tiketnya tidak tersedia di KursiKu (tidak ada API publik resmi untuk itu).
const SHOW = 4;
const RADII = [10, 20]; // coba 10 km dulu; kalau kosong, perluas ke 20 km

function useRealCinemas(lat, lon) {
  const [state, setState] = useState({
    status: "loading",
    items: [],
    radius: RADII[0],
    error: "",
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: "loading", error: "" }));
    (async () => {
      try {
        for (const radius of RADII) {
          const { items } = await fetchNearby(lat, lon, radius, {
            signal: ctrl.signal,
          });
          if (items.length > 0 || radius === RADII[RADII.length - 1]) {
            setState({ status: "done", items, radius, error: "" });
            return;
          }
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        setState({
          status: "error",
          items: [],
          radius: RADII[0],
          error: e.message,
        });
      }
    })();
    return () => ctrl.abort();
  }, [lat, lon, tick]);

  return [state, () => setTick((t) => t + 1)];
}

function Waiting() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="text-muted">
      <span role="status">
        Mencari CGV, XXI, dan bioskop lain di sekitarmu…
      </span>{" "}
      <span aria-hidden="true">{sec} dtk.</span> Server peta gratis kadang butuh
      10–20 detik.
    </p>
  );
}

function RealList({ lat, lon }) {
  const [state, retry] = useRealCinemas(lat, lon);

  if (state.status === "loading") return <Waiting />;
  if (state.status === "error") {
    return (
      <p className="text-muted">
        {state.error}{" "}
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-11 items-center text-accent-ink underline"
        >
          Coba lagi
        </button>
      </p>
    );
  }
  if (state.items.length === 0) {
    return (
      <p className="text-muted">
        Tidak ada bioskop tercatat dalam {state.radius} km. Data peta bisa
        kurang lengkap.{" "}
        <Link to="/terdekat" className="text-accent-ink underline">
          Coba pilih kota lain
        </Link>
      </p>
    );
  }

  const items = state.items.slice(0, SHOW);
  return (
    <div>
      <p className="font-medium">
        📍 Bioskop terdekat dari lokasimu{" "}
        <span className="font-normal text-muted">
          (dalam {state.radius} km)
        </span>
      </p>
      <ol className="mt-2 divide-y divide-line">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex items-start justify-between gap-3 py-2"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2">
                <span className="font-medium">{b.name}</span>
                {b.brand && (
                  <span className="rounded border border-line-strong px-1.5 text-xs font-semibold">
                    {b.brand}
                  </span>
                )}
              </p>
              {b.address && <p className="text-xs text-muted">{b.address}</p>}
              <a
                href={directionsUrl(b)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-xs text-accent-ink underline"
              >
                Rute di Google Maps
              </a>
            </div>
            <p className="shrink-0 pt-0.5 font-semibold text-accent-ink">
              {fmtKm(b.km)}
            </p>
          </li>
        ))}
      </ol>
      {state.items.length > SHOW && (
        <Link
          to="/terdekat"
          className="inline-flex min-h-11 items-center text-accent-ink underline"
        >
          Lihat semua {state.items.length} bioskop
        </Link>
      )}
    </div>
  );
}

// geo = hasil useUserLocation; nearest = { cinema, km } cabang KursiKu terdekat (untuk pesan tiket)
export default function NearbyCinemas({ geo, nearest, onPick }) {
  const box = "mb-4 rounded-xl border border-line bg-panel p-3 text-sm";

  if (geo.status === "locating")
    return (
      <p role="status" className={`${box} text-muted`}>
        📍 Menentukan lokasimu…
      </p>
    );

  if (geo.status === "idle") {
    return (
      <p className={box}>
        <button
          type="button"
          onClick={geo.request}
          className="inline-flex min-h-11 items-center text-accent-ink underline"
        >
          📍 Tampilkan bioskop terdekat dari lokasiku
        </button>
      </p>
    );
  }

  if (geo.status === "denied" || geo.status === "unavailable") {
    return (
      <p className={`${box} text-muted`}>
        {geo.status === "denied"
          ? "Izin lokasi ditolak, jadi bioskop terdekat tidak bisa ditampilkan. Izinkan lewat ikon gembok di address bar, lalu "
          : "Lokasimu tidak bisa ditentukan. "}
        <button
          type="button"
          onClick={geo.request}
          className="inline-flex min-h-11 items-center text-accent-ink underline"
        >
          coba lagi
        </button>
        . Atau{" "}
        <Link to="/terdekat" className="text-accent-ink underline">
          pilih kota manual
        </Link>
        .
      </p>
    );
  }

  // koordinat dibulatkan ~100 m sebelum dikirim ke server peta (cukup untuk jarak, lebih sedikit data lokasi keluar)
  const lat = Math.round(geo.lat * 1000) / 1000;
  const lon = Math.round(geo.lon * 1000) / 1000;

  return (
    <div className={`${box} space-y-3 border-accent/60`}>
      <RealList lat={lat} lon={lon} />

      <div className="border-t border-line pt-3">
        <p className="text-muted">
          Tiket di KursiKu hanya untuk cabang KursiKu (fiktif). Jadwal dan tiket
          CGV/XXI tidak tersedia di sini.
        </p>
        {nearest && (
          <p className="mt-2">
            Cabang KursiKu terdekat: <strong>{nearest.cinema.name}</strong> ·{" "}
            {fmtKm(nearest.km)}
            {nearest.km > 100 && (
              <span className="text-muted"> (belum ada cabang di kotamu)</span>
            )}
          </p>
        )}
        {nearest && (
          <button
            type="button"
            onClick={onPick}
            className="inline-flex min-h-11 items-center text-accent-ink underline"
          >
            Tampilkan hanya jadwal {nearest.cinema.name}
          </button>
        )}
      </div>

      <p className="text-xs text-faint">
        Data bioskop: © kontributor OpenStreetMap (bisa kurang lengkap).
        Lokasimu (dibulatkan) dikirim ke server peta hanya untuk pencarian ini
        dan tidak disimpan KursiKu.
      </p>
    </div>
  );
}
